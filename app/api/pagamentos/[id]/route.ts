import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { pixAprovado, cartaoAprovado } from "@/lib/mercadopago";
import { emitirTicket, type DadosTicket } from "@/lib/tickets";
import { revalidatePath } from "next/cache";

type Pagamento = {
  id: number; tipo: string; status: string; mp_id: string | null;
  external_ref: string | null; ticket_dados: string; ticket_id: number | null;
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await exigirSessao())) {
    return NextResponse.json({ erro: "sem sessão" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const db = getDb();
  const pg = db.prepare("SELECT * FROM pagamentos WHERE id = ?").get(Number(id)) as Pagamento | undefined;
  if (!pg) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });

  if (pg.status === "APROVADO") {
    return NextResponse.json({ status: "APROVADO", ticketId: pg.ticket_id });
  }
  if (pg.status !== "PENDENTE") {
    return NextResponse.json({ status: pg.status });
  }

  // consulta o Mercado Pago
  let situacao: "APROVADO" | "PENDENTE" | "CANCELADO" = "PENDENTE";
  try {
    situacao = pg.tipo === "PIX"
      ? await pixAprovado(pg.mp_id || "")
      : await cartaoAprovado(pg.external_ref || "");
  } catch {
    situacao = "PENDENTE";
  }

  if (situacao === "APROVADO") {
    const dados = JSON.parse(pg.ticket_dados) as DadosTicket & {
      aguarda_bruto?: boolean; particular?: boolean;
    };
    if (dados.aguarda_bruto) {
      // cliente particular pagou: vira solicitação para a balança lançar o peso bruto
      const r = db.prepare(`
        INSERT INTO solicitacoes (empresa_id, cliente, placa, motorista, material, tara,
          data_entrada, hora_entrada, forma, valor, pago_via)
        VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(dados.cliente, dados.placa, dados.motorista || null, dados.material || null,
        dados.tara, dados.data_entrada, dados.hora_entrada || null,
        dados.forma, dados.valor, dados.pago_via);
      const solicitacaoId = Number(r.lastInsertRowid);
      db.prepare(
        "UPDATE pagamentos SET status = 'APROVADO', aprovado_em = datetime('now','localtime') WHERE id = ?"
      ).run(pg.id);
      revalidatePath("/solicitacoes");
      return NextResponse.json({ status: "APROVADO", solicitacaoId });
    }
    const ticketId = emitirTicket(dados);
    db.prepare(
      "UPDATE pagamentos SET status = 'APROVADO', ticket_id = ?, aprovado_em = datetime('now','localtime') WHERE id = ?"
    ).run(ticketId, pg.id);
    revalidatePath("/pesagens");
    revalidatePath("/tickets");
    revalidatePath("/");
    return NextResponse.json({ status: "APROVADO", ticketId, autoPdf: dados.auto_pdf });
  }
  if (situacao === "CANCELADO") {
    db.prepare("UPDATE pagamentos SET status = 'CANCELADO' WHERE id = ?").run(pg.id);
    return NextResponse.json({ status: "CANCELADO" });
  }
  return NextResponse.json({ status: "PENDENTE" });
}

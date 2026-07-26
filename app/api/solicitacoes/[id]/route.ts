import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sessaoAtual } from "@/lib/auth";
import { pixAprovado, cartaoAprovado } from "@/lib/mercadopago";

// Tela de acompanhamento: status da solicitação e, quando houver cobrança
// Mercado Pago vinculada, confere o pagamento e libera para a balança.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await sessaoAtual();
  if (!s) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });
  const { id } = await ctx.params;
  const db = getDb();
  const sol = db.prepare(
    "SELECT id, empresa_id, status, ticket_id, pagamento_id, pago FROM solicitacoes WHERE id = ?"
  ).get(Number(id)) as
    | { id: number; empresa_id: number | null; status: string; ticket_id: number | null;
        pagamento_id: number | null; pago: number }
    | undefined;
  if (!sol) return NextResponse.json({ erro: "não encontrada" }, { status: 404 });
  if (s.papel === "emp" && sol.empresa_id !== s.empresaId) {
    return NextResponse.json({ erro: "sem permissão" }, { status: 403 });
  }
  if (s.papel === "part" && sol.empresa_id !== null) {
    return NextResponse.json({ erro: "sem permissão" }, { status: 403 });
  }

  let pago = !!sol.pago;
  // cobrança Mercado Pago pendente: confere agora
  if (sol.status === "AGUARDANDO" && sol.pagamento_id && !pago) {
    const pg = db.prepare(
      "SELECT id, tipo, mp_id, external_ref, status FROM pagamentos WHERE id = ?"
    ).get(sol.pagamento_id) as
      | { id: number; tipo: string; mp_id: string | null; external_ref: string | null; status: string }
      | undefined;
    if (pg && pg.status === "PENDENTE") {
      try {
        const situacao = pg.tipo === "PIX"
          ? await pixAprovado(pg.mp_id || "")
          : await cartaoAprovado(pg.external_ref || "");
        if (situacao === "APROVADO") {
          db.prepare(
            "UPDATE pagamentos SET status = 'APROVADO', aprovado_em = datetime('now','localtime') WHERE id = ?"
          ).run(pg.id);
          db.prepare(
            "UPDATE solicitacoes SET pago = 1, pago_em = datetime('now','localtime') WHERE id = ?"
          ).run(sol.id);
          pago = true;
        } else if (situacao === "CANCELADO") {
          db.prepare("UPDATE pagamentos SET status = 'CANCELADO' WHERE id = ?").run(pg.id);
        }
      } catch { /* sem rede agora; tenta no próximo ciclo */ }
    } else if (pg && pg.status === "APROVADO") {
      db.prepare("UPDATE solicitacoes SET pago = 1, pago_em = datetime('now','localtime') WHERE id = ?").run(sol.id);
      pago = true;
    }
  }

  return NextResponse.json({
    status: sol.status,
    ticketId: sol.ticket_id,
    pago,
    temPagamento: !!sol.pagamento_id,
  });
}

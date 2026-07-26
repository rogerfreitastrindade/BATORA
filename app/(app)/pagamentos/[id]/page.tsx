import { getDb } from "@/lib/db";
import { fmtBRL, fmtData } from "@/lib/format";
import { Titulo, Cartao } from "@/components/ui";
import { PagamentoAcompanha } from "@/components/pagamento-acompanha";
import { cancelarPagamento } from "@/lib/actions";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CreditCard, QrCode } from "lucide-react";

import { sessaoAtual } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Pagamento = {
  id: number; tipo: string; valor: number; status: string;
  qr_code: string | null; qr_base64: string | null; link: string | null;
  ticket_dados: string; ticket_id: number | null; criado_em: string;
};

export default async function PagamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao || sessao.papel === "emp") redirect("/pesagens");
  const { id } = await params;
  const pg = getDb().prepare("SELECT * FROM pagamentos WHERE id = ?").get(Number(id)) as Pagamento | undefined;
  if (!pg) notFound();
  const dados = JSON.parse(pg.ticket_dados) as { cliente: string; placa: string; particular?: boolean };
  if (sessao.papel === "part" && !dados.particular) redirect("/ticket");

  return (
    <>
      <Link href="/ticket"
        className="text-suave flex items-center gap-1.5 text-sm font-semibold cursor-pointer hover:text-texto transition-colors duration-200 w-fit mb-3">
        <ArrowLeft className="w-4 h-4" aria-hidden /> Voltar ao formulário
      </Link>
      <Titulo>
        <span className="flex items-center gap-2">
          {pg.tipo === "PIX"
            ? <QrCode className="w-7 h-7 text-cyan-300" aria-hidden />
            : <CreditCard className="w-7 h-7 text-primaria" aria-hidden />}
          Cobrança {pg.tipo === "PIX" ? "PIX" : "no cartão"} — {fmtBRL(pg.valor)}
        </span>
      </Titulo>
      <p className="text-suave mb-4 max-w-xl">
        Cliente <strong className="text-texto">{dados.cliente}</strong> · placa{" "}
        <strong className="text-texto num">{dados.placa}</strong> · criada em{" "}
        <span className="num">{fmtData(pg.criado_em.slice(0, 10))} às {pg.criado_em.slice(11, 16)}</span>.
        O ticket sai <strong className="text-texto">sozinho</strong> assim que o Mercado Pago aprovar o pagamento.
      </p>

      <Cartao className="p-5 max-w-xl">
        <PagamentoAcompanha
          id={pg.id}
          tipo={pg.tipo}
          statusInicial={pg.status}
          ticketIdInicial={pg.ticket_id}
          qrBase64={pg.qr_base64}
          qrCode={pg.qr_code}
          link={pg.link}
        />
        {pg.status === "PENDENTE" && (
          <form action={cancelarPagamento} className="mt-4 pt-4 border-t border-borda">
            <input type="hidden" name="id" value={pg.id} />
            <button type="submit"
              className="h-11 px-4 rounded-lg border border-perigo/40 text-red-300 text-sm font-semibold cursor-pointer transition-colors duration-200 hover:bg-perigo/10">
              Cancelar cobrança e voltar
            </button>
          </form>
        )}
      </Cartao>
    </>
  );
}

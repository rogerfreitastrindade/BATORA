import { getDb } from "@/lib/db";
import { sessaoAtual } from "@/lib/auth";
import { fmtData, fmtNum } from "@/lib/format";
import { Titulo, Cartao } from "@/components/ui";
import { SolicitacaoAcompanha } from "@/components/solicitacao-acompanha";
import { notFound, redirect } from "next/navigation";
import { Scale } from "lucide-react";

export const dynamic = "force-dynamic";

type Solicitacao = {
  id: number; empresa_id: number | null; cliente: string; placa: string; motorista: string | null;
  material: string | null; tara: number; data_entrada: string; hora_entrada: string | null;
  status: string; ticket_id: number | null; criado_em: string;
  pagamento_id: number | null; pago: number;
};

export default async function SolicitacaoEspera({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = getDb().prepare("SELECT * FROM solicitacoes WHERE id = ?").get(Number(id)) as
    | Solicitacao
    | undefined;
  if (!s) notFound();
  const sessao = await sessaoAtual();
  if (sessao?.papel === "emp" && s.empresa_id !== sessao.empresaId) redirect("/pesagens");
  if (sessao?.papel === "part" && s.empresa_id !== null) redirect("/ticket");

  // cobrança Mercado Pago vinculada (particular): dados para mostrar o QR / link
  const pagamento = s.pagamento_id
    ? (getDb().prepare(
        "SELECT tipo, qr_code, qr_base64, link FROM pagamentos WHERE id = ?"
      ).get(s.pagamento_id) as { tipo: string; qr_code: string | null; qr_base64: string | null; link: string | null } | undefined) ?? null
    : null;

  return (
    <>
      <Titulo>
        <span className="flex items-center gap-2">
          <Scale className="w-7 h-7 text-cta" aria-hidden /> Solicitação de ticket nº {s.id}
        </span>
      </Titulo>
      <p className="text-suave mb-4 max-w-xl num">
        {s.cliente} · placa <strong className="text-texto">{s.placa}</strong> · tara{" "}
        <strong className="text-texto">{fmtNum(s.tara)} kg</strong>
        {s.material ? ` · ${s.material}` : ""} · enviada em {fmtData(s.criado_em.slice(0, 10))} às{" "}
        {s.criado_em.slice(11, 16)}
      </p>
      <Cartao className="p-5 max-w-xl">
        <SolicitacaoAcompanha id={s.id} statusInicial={s.status} ticketIdInicial={s.ticket_id}
          pagamento={pagamento} pagoInicial={!s.pagamento_id || !!s.pago} />
      </Cartao>
    </>
  );
}

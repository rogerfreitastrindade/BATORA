import { obterTicket } from "@/lib/queries";
import { TicketFolha } from "@/components/ticket-folha";
import { TicketAcoes } from "@/components/ticket-acoes";
import { notFound, redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/auth";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TicketDetalhe({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string; pdf?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const t = obterTicket(Number(id));
  if (!t) notFound();
  const sessao = await sessaoAtual();
  const soLeitura = sessao?.papel !== "admin";
  if (sessao?.papel === "emp" && t.empresa_id !== sessao.empresaId) redirect("/tickets");
  if (sessao?.papel === "part" && t.empresa_id !== null) redirect("/ticket");
  const voltarPara = sessao?.papel === "part" ? "/ticket" : "/tickets";

  return (
    <>
      <div className="nao-imprimir mb-5 flex flex-col gap-4">
        <Link href={voltarPara} className="text-suave flex items-center gap-1.5 text-sm font-semibold cursor-pointer hover:text-texto transition-colors duration-200 w-fit">
          <ArrowLeft className="w-4 h-4" aria-hidden /> {voltarPara === "/ticket" ? "Novo pedido" : "Voltar aos tickets"}
        </Link>
        {sp.novo && (
          <p className="rounded-xl bg-ok/10 border border-ok/30 text-green-300 px-4 py-3 flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden />
            Ticket gerado e pesagem registrada no controle mensal automaticamente.
          </p>
        )}
        <TicketAcoes ticket={t} autoPdf={sp.pdf === "1"} />
        {!soLeitura && t.cliente_id && (
          <Link href={`/clientes/${t.cliente_id}`}
            className="text-primaria flex items-center gap-1.5 text-sm font-semibold cursor-pointer hover:underline w-fit">
            <Users className="w-4 h-4" aria-hidden /> Ver histórico do cliente {t.cliente}
          </Link>
        )}
      </div>
      <TicketFolha t={t} />
    </>
  );
}

"use client";

/* Tela de acompanhamento da solicitação.
   Particular com Mercado Pago: mostra primeiro o pagamento (QR PIX ou link de cartão);
   quando aprovar, passa para "aguardando o peso bruto" — que é lançado só pela balança.
   Verifica sozinha a cada 4 s; quando o ticket sai, abre na tela. */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, CheckCircle2, XCircle, Copy, Check, ExternalLink, QrCode, CreditCard,
} from "lucide-react";

export type PagamentoInfo = {
  tipo: string;
  qr_code: string | null;
  qr_base64: string | null;
  link: string | null;
};

export function SolicitacaoAcompanha({
  id, statusInicial, ticketIdInicial, pagamento = null, pagoInicial = true,
}: {
  id: number; statusInicial: string; ticketIdInicial: number | null;
  pagamento?: PagamentoInfo | null; pagoInicial?: boolean;
}) {
  const [status, setStatus] = useState(statusInicial);
  const [ticketId, setTicketId] = useState<number | null>(ticketIdInicial);
  const [pago, setPago] = useState(pagoInicial);
  const [copiado, setCopiado] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status !== "AGUARDANDO") return;
    const verificar = async () => {
      try {
        const res = await fetch(`/api/solicitacoes/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const dados = await res.json();
        if (dados.status) setStatus(dados.status);
        if (dados.ticketId) setTicketId(dados.ticketId);
        if (typeof dados.pago === "boolean") setPago(dados.pago);
      } catch { /* tenta de novo no próximo ciclo */ }
    };
    verificar();
    const timer = setInterval(verificar, 4000);
    return () => clearInterval(timer);
  }, [status, id]);

  useEffect(() => {
    if (status === "EMITIDO" && ticketId) {
      const t = setTimeout(() => router.push(`/tickets/${ticketId}?novo=1`), 1200);
      return () => clearTimeout(t);
    }
  }, [status, ticketId, router]);

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* clipboard indisponível */ }
  }

  if (status === "EMITIDO") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="w-16 h-16 text-ok" aria-hidden />
        <p className="text-xl font-bold text-green-300">Ticket emitido!</p>
        <p className="text-suave">Abrindo o ticket para imprimir ou baixar o PDF…</p>
      </div>
    );
  }
  if (status === "RECUSADO") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <XCircle className="w-16 h-16 text-perigo" aria-hidden />
        <p className="text-xl font-bold text-red-300">Solicitação recusada</p>
        <p className="text-suave">Procure o operador da balança para entender o motivo.</p>
      </div>
    );
  }

  // fase 1 — pagamento pendente (particular com Mercado Pago)
  if (!pago && pagamento) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-center font-bold text-lg flex items-center justify-center gap-2">
          {pagamento.tipo === "PIX"
            ? <QrCode className="w-5 h-5 text-cyan-300" aria-hidden />
            : <CreditCard className="w-5 h-5 text-primaria" aria-hidden />}
          Falta só o pagamento
        </p>
        {pagamento.tipo === "PIX" ? (
          <>
            {pagamento.qr_base64 && (
              <div className="bg-white rounded-xl p-3 w-fit mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`data:image/png;base64,${pagamento.qr_base64}`} alt="QR Code PIX para pagamento"
                  className="w-56 h-56 sm:w-64 sm:h-64" />
              </div>
            )}
            <p className="text-center text-suave text-sm">
              Escaneie o <strong className="text-texto">QR Code no app do banco</strong> ou copie o código abaixo.
            </p>
            {pagamento.qr_code && (
              <button type="button" onClick={() => copiar(pagamento.qr_code!)}
                className="h-12 rounded-xl bg-cyan-600 text-white font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-cyan-500 w-full">
                {copiado ? <Check className="w-5 h-5" aria-hidden /> : <Copy className="w-5 h-5" aria-hidden />}
                {copiado ? "Código PIX copiado!" : "Copiar código PIX (copia e cola)"}
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-center text-suave text-sm">
              Pague com <strong className="text-texto">cartão de crédito ou débito</strong> pelo Mercado Pago.
            </p>
            {pagamento.link && (
              <>
                <a href={pagamento.link} target="_blank" rel="noopener noreferrer"
                  className="h-12 rounded-xl bg-primaria-forte text-white font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-primaria w-full">
                  <ExternalLink className="w-5 h-5" aria-hidden /> Abrir página de pagamento
                </a>
                <button type="button" onClick={() => copiar(pagamento.link!)}
                  className="h-12 rounded-xl border border-borda text-texto font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-superficie-2 w-full">
                  {copiado ? <Check className="w-5 h-5" aria-hidden /> : <Copy className="w-5 h-5" aria-hidden />}
                  {copiado ? "Link copiado!" : "Copiar link do pagamento"}
                </button>
              </>
            )}
          </>
        )}
        <div className="rounded-xl bg-superficie-2 border border-borda px-4 py-3 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-cta shrink-0" aria-hidden />
          <p className="text-sm text-suave">
            <strong className="text-texto">Aguardando o pagamento…</strong> conferimos sozinho a cada 4 segundos.
            Assim que aprovar, seu pedido segue para a balança lançar o peso bruto.
          </p>
        </div>
      </div>
    );
  }

  // fase 2 — pago (ou sem cobrança): aguardando o peso bruto
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      {pago && pagamento && (
        <p className="w-full rounded-xl bg-ok/10 border border-ok/30 text-green-300 px-4 py-2.5 flex items-center justify-center gap-2 font-bold">
          <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden /> Pagamento aprovado!
        </p>
      )}
      <Loader2 className="w-14 h-14 animate-spin text-cta" aria-hidden />
      <p className="text-xl font-bold">Aguardando o peso bruto…</p>
      <p className="text-suave max-w-sm">
        A balança recebeu seu pedido e vai lançar o <strong className="text-amber-300">peso bruto</strong>{" "}
        lido no visor. Esta tela atualiza sozinha — assim que o ticket sair, ele abre aqui.
      </p>
    </div>
  );
}

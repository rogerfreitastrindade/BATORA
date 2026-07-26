"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, ExternalLink, Loader2, CheckCircle2, XCircle } from "lucide-react";

export function PagamentoAcompanha({
  id, tipo, statusInicial, ticketIdInicial, qrBase64, qrCode, link,
}: {
  id: number; tipo: string; statusInicial: string; ticketIdInicial: number | null;
  qrBase64: string | null; qrCode: string | null; link: string | null;
}) {
  const [status, setStatus] = useState(statusInicial);
  const [ticketId, setTicketId] = useState<number | null>(ticketIdInicial);
  const [solicitacaoId, setSolicitacaoId] = useState<number | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const router = useRouter();
  const autoPdfRef = useRef(false);

  async function verificar() {
    setVerificando(true);
    try {
      const res = await fetch(`/api/pagamentos/${id}`, { cache: "no-store" });
      const dados = await res.json();
      if (dados.status) setStatus(dados.status);
      if (dados.ticketId) setTicketId(dados.ticketId);
      if (dados.solicitacaoId) setSolicitacaoId(dados.solicitacaoId);
      if (dados.autoPdf) autoPdfRef.current = true;
    } catch {
      /* sem rede agora; tenta de novo no próximo ciclo */
    } finally {
      setVerificando(false);
    }
  }

  useEffect(() => {
    if (status !== "PENDENTE") return;
    const timer = setInterval(verificar, 4000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (status !== "APROVADO") return;
    const t = setTimeout(() => {
      if (solicitacaoId) {
        // particular: pagou → agora a balança lança o peso bruto
        router.push(`/solicitacoes/${solicitacaoId}`);
      } else if (ticketId) {
        router.push(`/tickets/${ticketId}?novo=1${autoPdfRef.current ? "&pdf=1" : ""}`);
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [status, ticketId, solicitacaoId, router]);

  async function copiar() {
    if (!qrCode) return;
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* clipboard indisponível */ }
  }

  if (status === "APROVADO") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="w-16 h-16 text-ok" aria-hidden />
        <p className="text-xl font-bold text-green-300">Pagamento aprovado!</p>
        <p className="text-suave">
          {solicitacaoId ? "Agora a balança vai lançar o peso bruto — abrindo o acompanhamento…" : "Abrindo o ticket…"}
        </p>
      </div>
    );
  }
  if (status === "CANCELADO" || status === "ERRO") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <XCircle className="w-16 h-16 text-perigo" aria-hidden />
        <p className="text-xl font-bold text-red-300">Cobrança {status === "ERRO" ? "com erro" : "cancelada"}</p>
        <p className="text-suave">Volte ao formulário e gere uma nova cobrança.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {tipo === "PIX" ? (
        <>
          {qrBase64 && (
            <div className="bg-white rounded-xl p-3 w-fit mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/png;base64,${qrBase64}`} alt="QR Code PIX para pagamento"
                className="w-56 h-56 sm:w-64 sm:h-64" />
            </div>
          )}
          <p className="text-center text-suave text-sm">
            Peça para o cliente <strong className="text-texto">escanear o QR Code</strong> no app do banco,
            ou copie o código abaixo e mande pelo WhatsApp.
          </p>
          {qrCode && (
            <button type="button" onClick={copiar}
              className="h-12 rounded-xl bg-cyan-600 text-white font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-cyan-500 w-full">
              {copiado ? <Check className="w-5 h-5" aria-hidden /> : <Copy className="w-5 h-5" aria-hidden />}
              {copiado ? "Código PIX copiado!" : "Copiar código PIX (copia e cola)"}
            </button>
          )}
        </>
      ) : (
        <>
          <p className="text-center text-suave text-sm">
            Abra o link no celular do cliente (ou copie e mande pelo WhatsApp) para ele pagar
            com <strong className="text-texto">cartão de crédito ou débito</strong> no Mercado Pago.
          </p>
          {link && (
            <>
              <a href={link} target="_blank" rel="noopener noreferrer"
                className="h-12 rounded-xl bg-primaria-forte text-white font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-primaria w-full">
                <ExternalLink className="w-5 h-5" aria-hidden /> Abrir página de pagamento
              </a>
              <button type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 2000);
                  } catch { /* clipboard indisponível */ }
                }}
                className="h-12 rounded-xl border border-borda text-texto font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-superficie-2 w-full">
                {copiado ? <Check className="w-5 h-5" aria-hidden /> : <Copy className="w-5 h-5" aria-hidden />}
                {copiado ? "Link copiado!" : "Copiar link para o WhatsApp"}
              </button>
            </>
          )}
        </>
      )}

      <div className="rounded-xl bg-superficie-2 border border-borda px-4 py-3 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-cta shrink-0" aria-hidden />
        <p className="text-sm text-suave">
          <strong className="text-texto">Aguardando o pagamento…</strong> verificamos sozinho a cada 4 segundos.
          Assim que aprovar, o ticket é emitido e abre na tela.
        </p>
      </div>
      <button type="button" onClick={verificar} disabled={verificando}
        className="h-11 rounded-lg border border-borda text-suave font-semibold cursor-pointer transition-colors duration-200 hover:text-texto disabled:opacity-60 w-full">
        {verificando ? "Verificando…" : "Já pagou? Verificar agora"}
      </button>
    </div>
  );
}

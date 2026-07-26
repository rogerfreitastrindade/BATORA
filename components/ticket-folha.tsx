/* Folha A4 do ticket com duas vias idênticas e linha de corte — replica a planilha TICKET TERCEIROS. */
import type { Ticket } from "@/lib/queries";
import { fmtData } from "@/lib/format";

function kg(v: number) {
  return `${v.toLocaleString("pt-BR")} kg`;
}

export function rotuloPagamento(t: Ticket & { pago_via?: string | null }): string {
  if (t.empresa_nome) return `MENSAL — ${t.empresa_nome}`;
  switch (t.pago_via) {
    case "MERCADOPAGO_PIX": return "PIX (pago — Mercado Pago)";
    case "MERCADOPAGO_CARTAO": return "CARTÃO (pago — Mercado Pago)";
    case "DINHEIRO": return "DINHEIRO";
    default: return t.forma;
  }
}

function Via({ t, via }: { t: Ticket; via: string }) {
  return (
    <div className="border-2 border-black p-2.5 sm:p-4 text-black">
      <header className="flex items-start gap-2 sm:gap-4 border-b-2 border-black pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Logo Balança do Barreiro" className="w-12 h-12 sm:w-20 sm:h-20 object-contain shrink-0" />
        <div className="flex-1 text-center min-w-0">
          <p className="text-base sm:text-xl font-bold tracking-widest">TICKET DE PESAGEM</p>
          <p className="text-sm sm:text-lg font-bold">BALANÇA DO BARREIRO</p>
          <p className="text-[11px] leading-tight">
            ROD BR-040 KM 465, BAIRRO BARREIRO DE CIMA<br />
            CEP 35.703-710, SETE LAGOAS - MG
          </p>
        </div>
        <div className="text-right text-[11px] shrink-0 w-20">
          <p className="font-bold">Nº {String(t.id).padStart(4, "0")}</p>
          <p>{via}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-3">
        <section className="border border-black">
          <p className="bg-black text-white text-center text-xs font-bold py-1 tracking-widest">PESAGEM TARA</p>
          <div className="p-2 text-sm flex flex-col gap-1">
            <p><span className="font-bold">DATA:</span> {fmtData(t.data_entrada)}</p>
            <p><span className="font-bold">HORA:</span> {t.hora_entrada ?? "—"}</p>
            <p className="text-base"><span className="font-bold">TARA:</span> {kg(t.tara)}</p>
          </div>
        </section>
        <section className="border border-black">
          <p className="bg-black text-white text-center text-xs font-bold py-1 tracking-widest">PESAGEM BRUTO</p>
          <div className="p-2 text-sm flex flex-col gap-1">
            <p><span className="font-bold">DATA:</span> {fmtData(t.data_saida)}</p>
            <p><span className="font-bold">HORA:</span> {t.hora_saida ?? "—"}</p>
            <p className="text-base"><span className="font-bold">BRUTO:</span> {kg(t.bruto)}</p>
          </div>
        </section>
      </div>

      <div className="mt-3 border-2 border-black flex items-center justify-between px-4 py-2">
        <span className="font-bold tracking-widest">LÍQUIDO</span>
        <span className="text-2xl font-bold">{kg(t.liquido)}</span>
      </div>

      <div className="mt-3 text-sm flex flex-col gap-1.5">
        <p><span className="font-bold">CLIENTE:</span> {t.cliente}</p>
        <p><span className="font-bold">PLACA:</span> {t.placa}</p>
        <p><span className="font-bold">MOTORISTA:</span> {t.motorista || "—"}</p>
        <p><span className="font-bold">MATERIAL:</span> {t.material || "—"}</p>
      </div>

      <footer className="mt-3 pt-2 border-t border-black flex items-end justify-between text-sm">
        <div>
          <p><span className="font-bold">PAGAMENTO:</span> {rotuloPagamento(t)}</p>
          {/* convênio mensal: o valor não sai no ticket (a cobrança é no fechamento do mês) */}
          {t.forma !== "MENSAL" && (
            <p><span className="font-bold">VALOR:</span> {t.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
          )}
        </div>
        <div className="text-center w-56">
          <div className="border-t border-black pt-1 text-xs">ASSINATURA</div>
        </div>
      </footer>
    </div>
  );
}

export function TicketFolha({ t }: { t: Ticket }) {
  return (
    <div className="folha-ticket bg-white rounded-xl shadow-xl mx-auto w-full max-w-3xl p-3 sm:p-6 print:p-0">
      <Via t={t} via="1ª VIA" />
      <div className="flex items-center gap-2 my-4 text-black" aria-hidden>
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
          <path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" />
        </svg>
        <div className="flex-1 border-t-2 border-dashed border-black" />
      </div>
      <Via t={t} via="2ª VIA" />
    </div>
  );
}

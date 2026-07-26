"use client";

import { useEffect, useState } from "react";
import type { Ticket } from "@/lib/queries";
import { gerarPdfTicket } from "@/lib/ticket-pdf";
import { Printer, FileDown, Check } from "lucide-react";

export function TicketAcoes({ ticket, autoPdf }: { ticket: Ticket; autoPdf?: boolean }) {
  const [gerando, setGerando] = useState(false);
  const [feito, setFeito] = useState(false);

  async function baixar() {
    setGerando(true);
    try {
      await gerarPdfTicket(ticket);
      setFeito(true);
      setTimeout(() => setFeito(false), 3000);
    } finally {
      setGerando(false);
    }
  }

  useEffect(() => {
    if (autoPdf) {
      // modo WhatsApp: baixa o PDF automaticamente ao abrir
      const id = setTimeout(() => { void baixar(); }, 400);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button type="button" onClick={() => window.print()}
        className="w-full sm:w-auto h-14 px-6 rounded-xl bg-primaria-forte text-white font-bold text-lg flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-primaria">
        <Printer className="w-6 h-6" aria-hidden />
        Imprimir (2 vias A4)
      </button>
      <button type="button" onClick={baixar} disabled={gerando}
        className="w-full sm:w-auto h-14 px-6 rounded-xl bg-cta text-cta-texto font-bold text-lg flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-amber-400 disabled:opacity-60">
        {feito ? <Check className="w-6 h-6" aria-hidden /> : <FileDown className="w-6 h-6" aria-hidden />}
        {gerando ? "Gerando…" : feito ? "PDF baixado!" : "Baixar PDF"}
      </button>
    </div>
  );
}

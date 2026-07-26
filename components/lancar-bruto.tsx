"use client";

import { useActionState, useState } from "react";
import { emitirDeSolicitacao } from "@/lib/actions";
import { FileText } from "lucide-react";

/** Campo do peso bruto com prévia do líquido — só o administrador vê e usa. */
export function LancarBrutoForm({ id, tara }: { id: number; tara: number }) {
  const [estado, action, pendente] = useActionState(emitirDeSolicitacao, null);
  const [bruto, setBruto] = useState("");
  const b = parseFloat(bruto.replace(",", "."));
  const liquido = !isNaN(b) ? b - tara : null;

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex flex-col gap-1 flex-1">
          <label htmlFor={`bruto-${id}`} className="text-xs font-bold text-amber-300 uppercase">
            Peso bruto — leia no visor (kg)
          </label>
          <input
            id={`bruto-${id}`} name="bruto" required inputMode="decimal" placeholder="0"
            value={bruto} onChange={(e) => setBruto(e.target.value)}
            className="h-14 rounded-xl bg-fundo border-2 border-cta px-4 num text-2xl font-bold w-full"
          />
        </div>
        <div className="rounded-xl bg-superficie-2 border border-borda px-4 py-2 sm:h-14 flex sm:flex-col items-center sm:items-start justify-between sm:justify-center gap-1">
          <span className="text-[11px] text-suave uppercase font-semibold">Líquido</span>
          <span className="num font-bold">
            {liquido === null ? "—" : `${liquido.toLocaleString("pt-BR")} kg`}
          </span>
        </div>
      </div>
      {estado?.erro && (
        <p role="alert" className="text-red-300 text-sm font-semibold">{estado.erro}</p>
      )}
      <button type="submit" disabled={pendente}
        className="h-12 rounded-xl bg-cta text-cta-texto font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-amber-400 disabled:opacity-60">
        <FileText className="w-5 h-5" aria-hidden />
        {pendente ? "Emitindo…" : "Emitir ticket com este bruto"}
      </button>
    </form>
  );
}

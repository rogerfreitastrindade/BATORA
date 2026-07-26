"use client";

import { useState } from "react";
import type { Empresa } from "@/lib/queries";

/** Par de campos Forma de pagamento + Empresa: MENSAL exige conveniada; PIX/DINHEIRO = PARTICULAR. */
export function FormaEmpresaCampos({
  empresas, prefixo, formaInicial = "PIX", empresaInicial = "",
}: { empresas: Empresa[]; prefixo: string; formaInicial?: string; empresaInicial?: string }) {
  const [forma, setForma] = useState(formaInicial);
  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${prefixo}-forma`} className="text-xs font-semibold text-suave uppercase">
          Forma de pagamento
        </label>
        <select
          id={`${prefixo}-forma`} name="forma" value={forma} onChange={(e) => setForma(e.target.value)}
          className="h-11 rounded-lg bg-fundo border border-borda px-3 cursor-pointer"
        >
          <option value="PIX">PIX</option>
          <option value="DINHEIRO">DINHEIRO</option>
          <option value="MENSAL">MENSAL</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${prefixo}-empresa`} className="text-xs font-semibold text-suave uppercase">
          Empresa
        </label>
        {forma === "MENSAL" ? (
          <select
            id={`${prefixo}-empresa`} name="empresa_id" required defaultValue={empresaInicial}
            className="h-11 rounded-lg bg-fundo border border-borda px-3 cursor-pointer"
          >
            <option value="" disabled>Selecione a conveniada</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
        ) : (
          <input
            id={`${prefixo}-empresa`} value="PARTICULAR" readOnly aria-readonly
            className="h-11 rounded-lg bg-superficie-2 border border-borda px-3 text-suave"
          />
        )}
      </div>
    </>
  );
}

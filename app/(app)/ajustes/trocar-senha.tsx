"use client";

import { useActionState } from "react";
import { trocarSenha } from "@/lib/actions";
import { KeyRound } from "lucide-react";

export function TrocarSenhaForm() {
  const [state, action, pending] = useActionState(trocarSenha, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="ts-atual" className="text-xs font-semibold text-suave uppercase">Senha atual</label>
        <input id="ts-atual" name="atual" type="password" required autoComplete="current-password"
          className="h-12 rounded-xl bg-fundo border border-borda px-3 w-full max-w-xs" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="ts-nova" className="text-xs font-semibold text-suave uppercase">Nova senha</label>
        <input id="ts-nova" name="nova" type="password" required minLength={4} autoComplete="new-password"
          className="h-12 rounded-xl bg-fundo border border-borda px-3 w-full max-w-xs" />
      </div>
      {state?.erro && <p role="alert" className="text-perigo text-sm font-medium">{state.erro}</p>}
      {state?.msg && <p role="status" className="text-green-300 text-sm font-medium">{state.msg}</p>}
      <button type="submit" disabled={pending}
        className="h-12 px-5 rounded-xl bg-primaria-forte text-white font-bold flex items-center gap-2 w-fit cursor-pointer transition-colors duration-200 hover:bg-primaria disabled:opacity-60">
        <KeyRound className="w-5 h-5" aria-hidden />
        {pending ? "Salvando…" : "Trocar senha"}
      </button>
    </form>
  );
}

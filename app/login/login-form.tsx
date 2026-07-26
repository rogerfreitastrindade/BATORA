"use client";

import { useActionState } from "react";
import { entrar } from "@/lib/actions";
import { LogIn } from "lucide-react";

export function LoginForm() {
  const [state, action, pending] = useActionState(entrar, null);
  return (
    <form action={action} className="bg-superficie border border-borda rounded-2xl p-6 flex flex-col gap-4">
      <label htmlFor="senha" className="text-sm font-medium text-suave">
        Senha
      </label>
      <input
        id="senha"
        name="senha"
        type="password"
        required
        autoFocus
        autoComplete="current-password"
        className="h-12 rounded-xl bg-fundo border border-borda px-4 text-lg text-texto placeholder:text-suave/60"
        placeholder="Digite a senha"
      />
      {state?.erro && (
        <p role="alert" className="text-perigo text-sm font-medium">
          {state.erro}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-xl bg-cta text-cta-texto font-bold text-lg flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-amber-400 disabled:opacity-60"
      >
        <LogIn className="w-5 h-5" aria-hidden />
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

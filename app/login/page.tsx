import { LoginForm } from "./login-form";
import { entrarParticular } from "@/lib/actions";
import { Scale, Banknote } from "lucide-react";

export const metadata = { title: "Entrar — BATORA" };

export default function LoginPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primaria-forte flex items-center justify-center">
            <Scale className="w-9 h-9 text-white" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-wide">BATORA</h1>
          <p className="text-suave text-sm">Balança do Barreiro</p>
        </div>

        <LoginForm />
        <p className="text-suave text-xs text-center mt-3">
          Administrador ou empresa conveniada: use sua senha acima.
        </p>

        <div className="flex items-center gap-3 my-6" aria-hidden>
          <div className="flex-1 border-t border-borda" />
          <span className="text-suave text-xs font-semibold uppercase">ou</span>
          <div className="flex-1 border-t border-borda" />
        </div>

        <form action={entrarParticular}>
          <button
            type="submit"
            className="w-full h-14 rounded-xl border-2 border-ok/50 bg-ok/10 text-green-300 font-bold text-base flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-ok/20"
          >
            <Banknote className="w-6 h-6" aria-hidden />
            Sou cliente particular (pagamento à vista)
          </button>
        </form>
        <p className="text-suave text-xs text-center mt-2">
          Sem senha: peça sua pesagem, pague por PIX ou cartão e receba o ticket na tela.
        </p>
      </div>
    </main>
  );
}

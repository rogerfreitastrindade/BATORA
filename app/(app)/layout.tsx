import Link from "next/link";
import { sair } from "@/lib/actions";
import { sessaoAtual } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { NavLinks, NavMobile, MenuMobile } from "@/components/nav";
import { SinoAdmin } from "@/components/sino-admin";
import { Scale, LogOut } from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessao = await sessaoAtual();
  const papel = sessao?.papel ?? "admin";
  const inicio = papel === "admin" ? "/" : papel === "part" ? "/ticket" : "/pesagens";
  let nomeEmpresa: string | null = null;
  if (sessao?.papel === "emp" && sessao.empresaId) {
    const e = getDb().prepare("SELECT nome FROM empresas WHERE id = ?").get(sessao.empresaId) as
      | { nome: string }
      | undefined;
    nomeEmpresa = e?.nome ?? null;
  }

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="nao-imprimir hidden lg:flex flex-col w-60 shrink-0 border-r border-borda bg-superficie min-h-dvh sticky top-0 max-h-dvh">
        <div className="flex items-center justify-between pr-3 border-b border-borda">
          <Link href={inicio} className="flex items-center gap-3 px-5 h-16 cursor-pointer">
            <span className="w-9 h-9 rounded-lg bg-primaria-forte flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" aria-hidden />
            </span>
            <span className="font-bold tracking-wide text-lg">BATORA</span>
          </Link>
          {papel === "admin" && <SinoAdmin />}
        </div>
        {nomeEmpresa && (
          <p className="px-5 py-2 text-xs text-amber-300 font-semibold border-b border-borda truncate">
            {nomeEmpresa} — acesso da empresa
          </p>
        )}
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1" aria-label="Menu principal">
          <NavLinks papel={papel} />
        </nav>
        <form action={sair} className="p-3 border-t border-borda">
          <button
            type="submit"
            className="w-full h-11 rounded-lg flex items-center gap-3 px-3 text-suave hover:text-texto hover:bg-superficie-2 transition-colors duration-200 cursor-pointer"
          >
            <LogOut className="w-5 h-5" aria-hidden />
            Sair
          </button>
        </form>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="nao-imprimir lg:hidden sticky top-0 z-30 bg-superficie border-b border-borda pt-[env(safe-area-inset-top)]">
          <div className="h-14 flex items-center justify-between px-4">
            <Link href={inicio} className="flex items-center gap-2 cursor-pointer min-w-0">
              <span className="w-8 h-8 rounded-lg bg-primaria-forte flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4 text-white" aria-hidden />
              </span>
              <span className="font-bold tracking-wide">BATORA</span>
              {nomeEmpresa && (
                <span className="text-[11px] text-amber-300 font-semibold truncate">· {nomeEmpresa}</span>
              )}
            </Link>
            <div className="flex items-center gap-1">
              {papel === "admin" && <SinoAdmin />}
              <MenuMobile sair={sair} papel={papel} />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 pb-28 lg:pb-8 max-w-7xl w-full mx-auto">{children}</main>

        <nav
          className="nao-imprimir lg:hidden fixed bottom-0 inset-x-0 z-30 bg-superficie border-t border-borda flex justify-around py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
          aria-label="Menu inferior"
        >
          <NavMobile papel={papel} />
        </nav>
      </div>
    </div>
  );
}

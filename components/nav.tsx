"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Scale, Ticket, Wallet, Receipt, Building2, HandCoins, Settings,
  MessageCircle, Menu, X, LogOut, Users, Bell,
} from "lucide-react";

const LINKS = [
  { href: "/", rotulo: "Painel", Icone: LayoutDashboard },
  { href: "/pesagens", rotulo: "Pesagens", Icone: Scale },
  { href: "/ticket", rotulo: "Novo ticket", Icone: Ticket },
  { href: "/ticket/whatsapp", rotulo: "Modo WhatsApp", Icone: MessageCircle },
  { href: "/tickets", rotulo: "Tickets emitidos", Icone: Receipt },
  { href: "/solicitacoes", rotulo: "Aguardando peso", Icone: Bell },
  { href: "/clientes", rotulo: "Clientes", Icone: Users },
  { href: "/caixa", rotulo: "Caixa diário", Icone: Wallet },
  { href: "/gastos", rotulo: "Gastos", Icone: HandCoins },
  { href: "/conveniadas", rotulo: "Conveniadas", Icone: Building2 },
  { href: "/empresas", rotulo: "Empresas", Icone: Building2 },
  { href: "/ajustes", rotulo: "Ajustes", Icone: Settings },
];

const LINKS_EMPRESA = ["/pesagens", "/ticket", "/tickets"];

function linksPara(papel: "admin" | "emp" | "part") {
  if (papel === "emp") {
    return LINKS.filter((l) => LINKS_EMPRESA.includes(l.href) && l.href !== "/ticket/whatsapp");
  }
  if (papel === "part") {
    return LINKS.filter((l) => l.href === "/ticket");
  }
  return LINKS;
}

function ativo(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/ticket") return pathname === "/ticket";
  return pathname === href || pathname.startsWith(href + "/");
}

export function NavLinks({ papel = "admin" }: { papel?: "admin" | "emp" | "part" }) {
  const pathname = usePathname();
  return (
    <>
      {linksPara(papel).map(({ href, rotulo, Icone }) => {
        const on = ativo(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`h-11 rounded-lg flex items-center gap-3 px-3 transition-colors duration-200 cursor-pointer ${
              on ? "bg-primaria-forte text-white font-semibold" : "text-suave hover:text-texto hover:bg-superficie-2"
            }`}
          >
            <Icone className="w-5 h-5 shrink-0" aria-hidden />
            {rotulo}
          </Link>
        );
      })}
    </>
  );
}

/** Menu completo do celular: botão hambúrguer no cabeçalho + painel em tela cheia. */
export function MenuMobile({ sair, papel = "admin" }: { sair: () => Promise<void>; papel?: "admin" | "emp" | "part" }) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  useEffect(() => setAberto(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = aberto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Abrir menu"
        aria-expanded={aberto}
        className="w-11 h-11 flex items-center justify-center rounded-lg text-suave hover:text-texto cursor-pointer transition-colors duration-200"
      >
        <Menu className="w-6 h-6" aria-hidden />
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 bg-fundo/70" onClick={() => setAberto(false)}>
          <div
            role="dialog"
            aria-label="Menu"
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-superficie border-l border-borda flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          >
            <div className="h-14 flex items-center justify-between px-4 border-b border-borda">
              <span className="font-bold tracking-wide">Menu</span>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar menu"
                className="w-11 h-11 flex items-center justify-center rounded-lg text-suave hover:text-texto cursor-pointer transition-colors duration-200"
              >
                <X className="w-6 h-6" aria-hidden />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1" aria-label="Menu completo">
              {linksPara(papel).map(({ href, rotulo, Icone }) => {
                const on = ativo(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={on ? "page" : undefined}
                    className={`h-12 rounded-lg flex items-center gap-3 px-3 transition-colors duration-200 cursor-pointer ${
                      on ? "bg-primaria-forte text-white font-semibold" : "text-suave hover:text-texto hover:bg-superficie-2"
                    }`}
                  >
                    <Icone className="w-5 h-5 shrink-0" aria-hidden />
                    {rotulo}
                  </Link>
                );
              })}
            </nav>
            <form action={sair} className="p-3 border-t border-borda">
              <button
                type="submit"
                className="w-full h-12 rounded-lg flex items-center gap-3 px-3 text-suave hover:text-texto hover:bg-superficie-2 transition-colors duration-200 cursor-pointer"
              >
                <LogOut className="w-5 h-5" aria-hidden />
                Sair
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const MOBILE = [
  { href: "/", rotulo: "Painel", Icone: LayoutDashboard },
  { href: "/pesagens", rotulo: "Pesagens", Icone: Scale },
  { href: "/ticket", rotulo: "Ticket", Icone: Ticket },
  { href: "/ticket/whatsapp", rotulo: "WhatsApp", Icone: MessageCircle },
  { href: "/caixa", rotulo: "Caixa", Icone: Wallet },
];

const MOBILE_EMPRESA = ["/pesagens", "/ticket", "/tickets"];

export function NavMobile({ papel = "admin" }: { papel?: "admin" | "emp" | "part" }) {
  const pathname = usePathname();
  const itens = papel === "part"
    ? LINKS.filter((l) => l.href === "/ticket").map((l) => ({ href: l.href, rotulo: "Ticket", Icone: l.Icone }))
    : papel === "emp"
    ? LINKS.filter((l) => MOBILE_EMPRESA.includes(l.href)).map((l) => ({
        href: l.href,
        rotulo: l.href === "/tickets" ? "Tickets" : l.href === "/ticket" ? "Ticket" : "Pesagens",
        Icone: l.Icone,
      }))
    : MOBILE;
  return (
    <>
      {itens.map(({ href, rotulo, Icone }) => {
        const on = ativo(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-14 rounded-lg cursor-pointer transition-colors duration-200 ${
              on ? "text-primaria" : "text-suave hover:text-texto"
            }`}
          >
            <Icone className="w-6 h-6" aria-hidden />
            <span className="text-[11px] font-medium">{rotulo}</span>
          </Link>
        );
      })}
    </>
  );
}

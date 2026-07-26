import { NextRequest, NextResponse } from "next/server";
import { sessaoEdge, SESSION_COOKIE } from "@/lib/auth-edge";

// Rotas que uma EMPRESA conveniada pode acessar (todo o resto é só do dono/admin)
function empresaPodeAcessar(pathname: string): boolean {
  if (pathname === "/pesagens") return true;                 // lista (só as dela; sem edição)
  if (pathname === "/tickets") return true;                  // lista (só os dela)
  if (/^\/tickets\/\d+$/.test(pathname)) return true;        // ver/imprimir ticket dela
  if (pathname === "/ticket") return true;                   // emitir ticket da própria empresa
  if (/^\/solicitacoes\/\d+$/.test(pathname)) return true;   // tela de espera do peso bruto
  if (/^\/api\/solicitacoes\/\d+$/.test(pathname)) return true; // consulta de status
  return false;
}

// Rotas que um CLIENTE PARTICULAR (sem senha) pode acessar
function particularPodeAcessar(pathname: string): boolean {
  if (pathname === "/ticket") return true;                       // pedir o ticket
  if (/^\/pagamentos\/\d+$/.test(pathname)) return true;        // pagar (QR / link)
  if (/^\/api\/pagamentos\/\d+$/.test(pathname)) return true;
  if (/^\/solicitacoes\/\d+$/.test(pathname)) return true;      // esperar o peso bruto
  if (/^\/api\/solicitacoes\/\d+$/.test(pathname)) return true;
  if (/^\/tickets\/\d+$/.test(pathname)) return true;           // ver/baixar o ticket pronto
  return false;
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/logo") ||
    pathname.startsWith("/icone") ||
    pathname.startsWith("/apple-touch-icon")
  ) {
    return NextResponse.next();
  }
  const sessao = await sessaoEdge(req.cookies.get(SESSION_COOKIE)?.value);
  if (!sessao) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (sessao.papel === "emp" && !empresaPodeAcessar(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/pesagens";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (sessao.papel === "part" && !particularPodeAcessar(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/ticket";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { SECRET, SESSION_COOKIE, payloadSessao, type Sessao } from "./auth-edge";

export { SESSION_COOKIE, type Sessao };

export function assinarSessao(papel: "admin" | "emp" | "part", empresaId = 0): string {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 365; // 1 ano
  const payload = payloadSessao(String(exp), papel, String(empresaId));
  const mac = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

export function validarSessao(token: string | undefined): Sessao | null {
  if (!token) return null;
  const partes = token.split(".");
  if (partes.length !== 4) return null;
  const [exp, papel, empresaId, mac] = partes;
  if (Number(exp) < Date.now()) return null;
  if (papel !== "admin" && papel !== "emp" && papel !== "part") return null;
  const esperado = crypto.createHmac("sha256", SECRET)
    .update(payloadSessao(exp, papel, empresaId)).digest("hex");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(esperado))) return null;
  } catch {
    return null;
  }
  return { papel: papel as "admin" | "emp" | "part", empresaId: papel === "emp" ? Number(empresaId) || null : null };
}

/** Sessão atual (admin ou empresa) ou null. */
export async function sessaoAtual(): Promise<Sessao | null> {
  const jar = await cookies();
  return validarSessao(jar.get(SESSION_COOKIE)?.value);
}

export async function exigirSessao(): Promise<boolean> {
  return (await sessaoAtual()) !== null;
}

/** Garante que é o dono (admin); senão manda para a área de cada perfil ou login. */
export async function exigirAdmin(): Promise<void> {
  const s = await sessaoAtual();
  if (!s) redirect("/login");
  if (s.papel === "emp") redirect("/pesagens");
  if (s.papel === "part") redirect("/ticket");
}

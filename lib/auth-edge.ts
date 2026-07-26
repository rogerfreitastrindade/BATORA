// Funções de sessão sem dependências de Node — usáveis no middleware/proxy.
export const SECRET = "batora-balanca-do-barreiro-2026-local";
export const SESSION_COOKIE = "batora_sessao";

export type Sessao = {
  papel: "admin" | "emp" | "part"; // part = cliente particular (pagamento à vista)
  empresaId: number | null;        // preenchido quando papel = "emp"
};

export function payloadSessao(exp: string, papel: string, empresaId: string) {
  return `${exp}.${papel}.${empresaId}`;
}

/** Valida o token e devolve a sessão (admin ou empresa) — Web Crypto, roda no edge. */
export async function sessaoEdge(token: string | undefined): Promise<Sessao | null> {
  if (!token) return null;
  const partes = token.split(".");
  if (partes.length !== 4) return null;
  const [exp, papel, empresaId, mac] = partes;
  if (Number(exp) < Date.now()) return null;
  if (papel !== "admin" && papel !== "emp" && papel !== "part") return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payloadSessao(exp, papel, empresaId)));
  const esperado = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (mac !== esperado) return null;
  return { papel: papel as "admin" | "emp" | "part", empresaId: papel === "emp" ? Number(empresaId) || null : null };
}

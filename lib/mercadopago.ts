/* Integração com o Mercado Pago (PIX e cartão via link de pagamento).
   Precisa do Access Token de produção configurado em Ajustes. */
import crypto from "crypto";
import { getConfig } from "./db";

const API = "https://api.mercadopago.com";

export function mpConfigurado(): boolean {
  return getConfig("mp_access_token").trim().length > 0;
}

function headers(idempotencia?: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${getConfig("mp_access_token").trim()}`,
    "Content-Type": "application/json",
  };
  if (idempotencia) h["X-Idempotency-Key"] = idempotencia;
  return h;
}

export type CobrancaPix = {
  mp_id: string;
  qr_code: string;      // PIX copia e cola
  qr_base64: string;    // imagem PNG em base64
  link: string | null;  // página do pagamento no Mercado Pago
};

/** Cria uma cobrança PIX; o QR aparece na hora e expira em 1 hora. */
export async function criarCobrancaPix(valor: number, descricao: string, ref: string): Promise<CobrancaPix> {
  const res = await fetch(`${API}/v1/payments`, {
    method: "POST",
    headers: headers(crypto.randomUUID()),
    body: JSON.stringify({
      transaction_amount: Math.round(valor * 100) / 100,
      description: descricao,
      payment_method_id: "pix",
      external_reference: ref,
      date_of_expiration: new Date(Date.now() + 60 * 60 * 1000).toISOString().replace("Z", "-00:00"),
      payer: { email: "cliente@balancadobarreiro.com.br" },
    }),
  });
  const dados = await res.json();
  if (!res.ok) {
    throw new Error(dados?.message || `Mercado Pago recusou a cobrança (HTTP ${res.status})`);
  }
  const t = dados?.point_of_interaction?.transaction_data;
  if (!t?.qr_code) throw new Error("Mercado Pago não retornou o QR Code do PIX.");
  return {
    mp_id: String(dados.id),
    qr_code: t.qr_code,
    qr_base64: t.qr_code_base64 || "",
    link: t.ticket_url || null,
  };
}

export type CobrancaCartao = { mp_id: string; link: string };

/** Cria um link de pagamento (Checkout Pro) para o cliente pagar com cartão no celular dele. */
export async function criarCobrancaCartao(valor: number, descricao: string, ref: string): Promise<CobrancaCartao> {
  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      items: [{ title: descricao, quantity: 1, unit_price: Math.round(valor * 100) / 100, currency_id: "BRL" }],
      external_reference: ref,
      payment_methods: { excluded_payment_types: [{ id: "ticket" }], installments: 12 },
      statement_descriptor: "BALANCA BARREIRO",
    }),
  });
  const dados = await res.json();
  if (!res.ok) {
    throw new Error(dados?.message || `Mercado Pago recusou o link de cartão (HTTP ${res.status})`);
  }
  return { mp_id: String(dados.id), link: dados.init_point };
}

/** Consulta se um pagamento PIX foi aprovado. */
export async function pixAprovado(mpId: string): Promise<"APROVADO" | "PENDENTE" | "CANCELADO"> {
  const res = await fetch(`${API}/v1/payments/${mpId}`, { headers: headers(), cache: "no-store" });
  if (!res.ok) return "PENDENTE";
  const dados = await res.json();
  if (dados.status === "approved") return "APROVADO";
  if (["cancelled", "rejected", "refunded", "expired"].includes(dados.status)) return "CANCELADO";
  return "PENDENTE";
}

/** Consulta se alguma cobrança com esta referência (link de cartão) foi aprovada. */
export async function cartaoAprovado(ref: string): Promise<"APROVADO" | "PENDENTE"> {
  const res = await fetch(
    `${API}/v1/payments/search?external_reference=${encodeURIComponent(ref)}&sort=date_created&criteria=desc`,
    { headers: headers(), cache: "no-store" }
  );
  if (!res.ok) return "PENDENTE";
  const dados = await res.json();
  const aprovado = (dados?.results || []).some((p: { status: string }) => p.status === "approved");
  return aprovado ? "APROVADO" : "PENDENTE";
}

"use client";

import { jsPDF } from "jspdf";
import type { Ticket } from "./queries";

const fmtData = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const kg = (v: number) => `${v.toLocaleString("pt-BR")} kg`;
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function carregarLogo(): Promise<string | null> {
  try {
    const res = await fetch("/logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function desenharVia(doc: jsPDF, t: Ticket, logo: string | null, topo: number, via: string) {
  const L = 14; // margem esquerda
  const W = 182; // largura útil
  const R = L + W;

  doc.setDrawColor(0);
  doc.setLineWidth(0.6);
  doc.rect(L, topo, W, 128);

  // cabeçalho
  if (logo) doc.addImage(logo, "PNG", L + 4, topo + 4, 22, 22);
  else doc.rect(L + 4, topo + 4, 22, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("TICKET DE PESAGEM", L + W / 2, topo + 11, { align: "center" });
  doc.setFontSize(13);
  doc.text("BALANÇA DO BARREIRO", L + W / 2, topo + 18, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("ROD BR-040 KM 465, BAIRRO BARREIRO DE CIMA", L + W / 2, topo + 23, { align: "center" });
  doc.text("CEP 35.703-710, SETE LAGOAS - MG", L + W / 2, topo + 27, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Nº ${String(t.id).padStart(4, "0")}`, R - 4, topo + 8, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(via, R - 4, topo + 13, { align: "right" });
  doc.setLineWidth(0.6);
  doc.line(L, topo + 30, R, topo + 30);

  // blocos TARA / BRUTO
  const by = topo + 34;
  const bw = (W - 12) / 2;
  for (const [i, bloco] of ([
    { titulo: "PESAGEM TARA", data: t.data_entrada, hora: t.hora_entrada, rot: "TARA", peso: t.tara },
    { titulo: "PESAGEM BRUTO", data: t.data_saida, hora: t.hora_saida, rot: "BRUTO", peso: t.bruto },
  ] as const).map((b, i) => [i, b] as const)) {
    const bx = L + 4 + i * (bw + 4);
    doc.setLineWidth(0.3);
    doc.rect(bx, by, bw, 30);
    doc.setFillColor(0, 0, 0);
    doc.rect(bx, by, bw, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(bloco.titulo, bx + bw / 2, by + 4.2, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`DATA: ${fmtData(bloco.data)}`, bx + 3, by + 12);
    doc.text(`HORA: ${bloco.hora ?? "—"}`, bx + 3, by + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${bloco.rot}: ${kg(bloco.peso)}`, bx + 3, by + 26);
  }

  // líquido
  const ly = by + 34;
  doc.setLineWidth(0.6);
  doc.rect(L + 4, ly, W - 8, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("LÍQUIDO", L + 8, ly + 8);
  doc.setFontSize(16);
  doc.text(kg(t.liquido), R - 8, ly + 8.5, { align: "right" });

  // dados
  let dy = ly + 20;
  doc.setFontSize(10);
  const linha = (rot: string, val: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${rot}:`, L + 4, dy);
    doc.setFont("helvetica", "normal");
    doc.text(val || "—", L + 32, dy);
    dy += 6;
  };
  linha("CLIENTE", t.cliente);
  linha("PLACA", t.placa);
  linha("MOTORISTA", t.motorista || "—");
  linha("MATERIAL", t.material || "—");

  // rodapé
  const fy = topo + 128 - 12;
  doc.setLineWidth(0.3);
  doc.line(L, fy - 4, R, fy - 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const tp = t as Ticket & { pago_via?: string | null };
  const pagamento = t.empresa_nome
    ? `MENSAL — ${t.empresa_nome}`
    : tp.pago_via === "MERCADOPAGO_PIX" ? "PIX (pago — Mercado Pago)"
    : tp.pago_via === "MERCADOPAGO_CARTAO" ? "CARTÃO (pago — Mercado Pago)"
    : tp.pago_via === "DINHEIRO" ? "DINHEIRO"
    : t.forma;
  doc.text(`PAGAMENTO: ${pagamento}`, L + 4, fy + 1);
  // convênio mensal: o valor não sai no ticket (a cobrança é no fechamento do mês)
  if (t.forma !== "MENSAL") {
    doc.text(`VALOR: ${brl(t.valor)}`, L + 4, fy + 6.5);
  }
  doc.line(R - 66, fy + 4, R - 6, fy + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("ASSINATURA", R - 36, fy + 8, { align: "center" });
}

export async function gerarPdfTicket(t: Ticket): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logo = await carregarLogo();
  desenharVia(doc, t, logo, 8, "1ª VIA");
  // linha de corte
  doc.setLineDashPattern([2, 2], 0);
  doc.setLineWidth(0.3);
  doc.line(10, 148.5, 200, 148.5);
  doc.setLineDashPattern([], 0);
  desenharVia(doc, t, logo, 155, "2ª VIA");
  doc.save(`ticket-${String(t.id).padStart(4, "0")}-${t.placa}.pdf`);
}

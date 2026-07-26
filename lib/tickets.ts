/* Emissão de ticket: grava o ticket e a pesagem correspondente (mesma numeração mensal). */
import { getDb, proximoSeq, resolverCliente } from "./db";

export type DadosTicket = {
  cliente: string;
  placa: string;
  motorista: string;
  material: string;
  tara: number;
  bruto: number;
  data_entrada: string;
  hora_entrada: string;
  data_saida: string;
  hora_saida: string;
  empresa_id: number | null;
  forma: "PIX" | "DINHEIRO" | "MENSAL";
  valor: number;
  pago_via: string | null; // DINHEIRO | MERCADOPAGO_PIX | MERCADOPAGO_CARTAO | null (mensal)
  auto_pdf: boolean;
};

export function emitirTicket(d: DadosTicket): number {
  const db = getDb();
  const liquido = Math.round((d.bruto - d.tara) * 100) / 100;
  const cliente_id = resolverCliente(d.cliente);

  const emitir = db.transaction(() => {
    const r = db.prepare(`
      INSERT INTO tickets (cliente, placa, motorista, material, tara, bruto, liquido,
        data_entrada, hora_entrada, data_saida, hora_saida, empresa_id, forma, valor, cliente_id, pago_via)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      d.cliente, d.placa, d.motorista || null, d.material || null, d.tara, d.bruto, liquido,
      d.data_entrada, d.hora_entrada || null, d.data_saida, d.hora_saida || null,
      d.empresa_id, d.forma, d.valor, cliente_id, d.pago_via
    );
    const ticketId = Number(r.lastInsertRowid);

    const ano = Number(d.data_saida.slice(0, 4));
    const mes = Number(d.data_saida.slice(5, 7));
    db.prepare(`
      INSERT INTO pesagens (seq, data, hora, placa, forma, empresa_id, ano, mes, ticket_id, cliente_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(proximoSeq(ano, mes), d.data_saida, d.hora_saida || null, d.placa, d.forma,
      d.empresa_id, ano, mes, ticketId, cliente_id);

    return ticketId;
  });
  return emitir();
}

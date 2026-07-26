import { getDb, precoAvulso } from "./db";

export type Empresa = { id: number; nome: string; valor_pesagem: number; ativa: number; senha?: string | null };
export type Pesagem = {
  id: number; seq: number; data: string; hora: string | null; placa: string;
  forma: string; empresa_id: number | null; empresa_nome: string | null;
  ano: number; mes: number; ticket_id: number | null;
  cliente_id: number | null; cliente_nome?: string | null;
};
export type Ticket = {
  id: number; cliente: string; placa: string; motorista: string | null; material: string | null;
  tara: number; bruto: number; liquido: number;
  data_entrada: string; hora_entrada: string | null; data_saida: string; hora_saida: string | null;
  empresa_id: number | null; empresa_nome?: string | null; forma: string; valor: number;
  cliente_id?: number | null;
};
export type DiaCaixa = {
  data: string; inicio: number; entradas: number; pix: number; retiradas: number;
  obs: string | null; total_dinheiro: number; total_dia: number;
};
export type Gasto = { id: number; data: string; hora: string | null; valor: number; descricao: string };
export type Cliente = {
  id: number; nome: string; telefone: string | null; obs: string | null; criado_em: string;
  cpf_cnpj: string | null; endereco: string | null; email: string | null; contato: string | null;
  rua: string | null; numero: string | null; bairro: string | null; cidade: string | null; estado: string | null;
  qtd_tickets?: number; qtd_pesagens?: number; ultima_visita?: string | null;
};
export type LinhaConveniada = {
  empresa_id: number; nome: string; valor_pesagem: number; qtd: number;
  total_calculado: number; valor_manual: number | null; total: number;
  status: string; obs: string | null; pago_em: string | null;
};

export function listarEmpresas(somenteAtivas = false): Empresa[] {
  const where = somenteAtivas ? "WHERE ativa = 1" : "";
  return getDb().prepare(`SELECT * FROM empresas ${where} ORDER BY nome`).all() as Empresa[];
}

/** Lista para formulários: nunca envia a senha das empresas ao navegador. */
export function listarEmpresasSemSenha(somenteAtivas = true): Empresa[] {
  const where = somenteAtivas ? "WHERE ativa = 1" : "";
  return getDb().prepare(
    `SELECT id, nome, valor_pesagem, ativa FROM empresas ${where} ORDER BY nome`
  ).all() as Empresa[];
}

export function listarPesagens(filtro: {
  ano?: number; mes?: number; empresa_id?: number | "PARTICULAR"; forma?: string; placa?: string;
  limite?: number;
}): Pesagem[] {
  const cond: string[] = [];
  const args: (string | number)[] = [];
  if (filtro.ano && filtro.mes) { cond.push("p.ano = ? AND p.mes = ?"); args.push(filtro.ano, filtro.mes); }
  if (filtro.empresa_id === "PARTICULAR") cond.push("p.empresa_id IS NULL");
  else if (filtro.empresa_id) { cond.push("p.empresa_id = ?"); args.push(filtro.empresa_id); }
  if (filtro.forma) { cond.push("p.forma = ?"); args.push(filtro.forma); }
  if (filtro.placa) { cond.push("p.placa LIKE ?"); args.push(`%${filtro.placa.toUpperCase()}%`); }
  const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
  const lim = filtro.limite ? `LIMIT ${filtro.limite}` : "";
  return getDb().prepare(`
    SELECT p.*, e.nome AS empresa_nome,
      COALESCE(c.nome, (SELECT c2.nome FROM tickets t JOIN clientes c2 ON c2.id = t.cliente_id WHERE t.id = p.ticket_id)) AS cliente_nome
    FROM pesagens p
    LEFT JOIN empresas e ON e.id = p.empresa_id
    LEFT JOIN clientes c ON c.id = p.cliente_id
    ${where}
    ORDER BY p.data DESC, p.seq DESC ${lim}
  `).all(...args) as Pesagem[];
}

export function mesesComPesagens(): { ano: number; mes: number }[] {
  return getDb().prepare(
    "SELECT DISTINCT ano, mes FROM pesagens ORDER BY ano DESC, mes DESC"
  ).all() as { ano: number; mes: number }[];
}

export function painelConveniadas(ano: number, mes: number): LinhaConveniada[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT e.id AS empresa_id, e.nome, e.valor_pesagem,
      (SELECT COUNT(*) FROM pesagens p WHERE p.empresa_id = e.id AND p.ano = ? AND p.mes = ? AND p.forma = 'MENSAL') AS qtd,
      c.valor_manual, COALESCE(c.status, 'EM ABERTO') AS status, c.obs, c.pago_em
    FROM empresas e
    LEFT JOIN cobrancas c ON c.empresa_id = e.id AND c.ano = ? AND c.mes = ?
    WHERE e.ativa = 1
    ORDER BY e.nome
  `).all(ano, mes, ano, mes) as (Omit<LinhaConveniada, "total_calculado" | "total">)[];
  return rows
    .map((r) => {
      const total_calculado = r.qtd * r.valor_pesagem;
      const total = r.valor_manual ?? total_calculado;
      return { ...r, total_calculado, total };
    })
    .filter((r) => r.qtd > 0 || r.valor_manual !== null);
}

export function balancoMensal(ano: number, mes: number) {
  const db = getDb();
  const preco = precoAvulso();
  const contagem = db.prepare(`
    SELECT forma, COUNT(*) AS qtd FROM pesagens WHERE ano = ? AND mes = ? GROUP BY forma
  `).all(ano, mes) as { forma: string; qtd: number }[];
  const qtd = (f: string) => contagem.find((c) => c.forma === f)?.qtd ?? 0;
  const qtdDinheiro = qtd("DINHEIRO");
  const qtdPix = qtd("PIX");
  const qtdMensal = qtd("MENSAL");
  const conveniadas = painelConveniadas(ano, mes);
  const totalConveniadas = conveniadas.reduce((s, c) => s + c.total, 0);
  const recebidoConveniadas = conveniadas.filter((c) => c.status === "PAGO").reduce((s, c) => s + c.total, 0);
  const mesStr = `${ano}-${String(mes).padStart(2, "0")}`;
  const gastos = db.prepare(
    "SELECT COALESCE(SUM(valor), 0) AS t FROM gastos WHERE substr(data, 1, 7) = ?"
  ).get(mesStr) as { t: number };
  const receitaDinheiro = qtdDinheiro * preco;
  const receitaPix = qtdPix * preco;
  return {
    ano, mes, preco,
    qtdDinheiro, qtdPix, qtdMensal,
    qtdTotal: qtdDinheiro + qtdPix + qtdMensal,
    receitaDinheiro, receitaPix,
    totalConveniadas, recebidoConveniadas,
    emAbertoConveniadas: totalConveniadas - recebidoConveniadas,
    gastos: gastos.t,
    resultado: receitaDinheiro + receitaPix + totalConveniadas - gastos.t,
  };
}

export function evolucaoMensal(limite = 12) {
  const meses = mesesComPesagens().slice(0, limite).reverse();
  return meses.map(({ ano, mes }) => {
    const b = balancoMensal(ano, mes);
    return { ano, mes, receita: b.receitaDinheiro + b.receitaPix + b.totalConveniadas, resultado: b.resultado, pesagens: b.qtdTotal };
  });
}

export function listarCaixaMes(mesStr: string): DiaCaixa[] {
  const rows = getDb().prepare(
    "SELECT * FROM caixa WHERE substr(data, 1, 7) = ? ORDER BY data"
  ).all(mesStr) as Omit<DiaCaixa, "total_dinheiro" | "total_dia">[];
  return rows.map((r) => ({
    ...r,
    total_dinheiro: r.inicio + r.entradas - r.retiradas,
    total_dia: r.inicio + r.entradas - r.retiradas + r.pix,
  }));
}

export function diaCaixa(data: string): DiaCaixa | null {
  const r = getDb().prepare("SELECT * FROM caixa WHERE data = ?").get(data) as
    | Omit<DiaCaixa, "total_dinheiro" | "total_dia">
    | undefined;
  if (!r) return null;
  return {
    ...r,
    total_dinheiro: r.inicio + r.entradas - r.retiradas,
    total_dia: r.inicio + r.entradas - r.retiradas + r.pix,
  };
}

/** Final do dia anterior mais recente antes de `data` (para INÍCIO DO DIA automático). */
export function finalDiaAnterior(data: string): number {
  const r = getDb().prepare(
    "SELECT inicio + entradas - retiradas AS final FROM caixa WHERE data < ? ORDER BY data DESC LIMIT 1"
  ).get(data) as { final: number } | undefined;
  return r?.final ?? 0;
}

/** Sugestões automáticas para lançamento do dia a partir das pesagens e gastos. */
export function sugestaoDia(data: string) {
  const db = getDb();
  const preco = precoAvulso();
  const c = db.prepare(`
    SELECT forma, COUNT(*) AS qtd FROM pesagens WHERE data = ? AND forma IN ('DINHEIRO','PIX') GROUP BY forma
  `).all(data) as { forma: string; qtd: number }[];
  const qtd = (f: string) => c.find((x) => x.forma === f)?.qtd ?? 0;
  const g = db.prepare("SELECT COALESCE(SUM(valor), 0) AS t FROM gastos WHERE data = ?").get(data) as { t: number };
  return {
    inicio: finalDiaAnterior(data),
    entradas: qtd("DINHEIRO") * preco,
    pix: qtd("PIX") * preco,
    retiradas: g.t,
  };
}

export function listarGastos(mesStr?: string): Gasto[] {
  if (mesStr) {
    return getDb().prepare(
      "SELECT * FROM gastos WHERE substr(data, 1, 7) = ? ORDER BY data DESC, id DESC"
    ).all(mesStr) as Gasto[];
  }
  return getDb().prepare("SELECT * FROM gastos ORDER BY data DESC, id DESC LIMIT 200").all() as Gasto[];
}

export function listarTickets(limite = 100, empresaId?: number): Ticket[] {
  const where = empresaId ? "WHERE t.empresa_id = ?" : "";
  const args: number[] = empresaId ? [empresaId, limite] : [limite];
  return getDb().prepare(`
    SELECT t.*, e.nome AS empresa_nome FROM tickets t
    LEFT JOIN empresas e ON e.id = t.empresa_id
    ${where}
    ORDER BY t.data_saida DESC, t.id DESC LIMIT ?
  `).all(...args) as Ticket[];
}

export function obterTicket(id: number): Ticket | null {
  return (getDb().prepare(`
    SELECT t.*, e.nome AS empresa_nome FROM tickets t
    LEFT JOIN empresas e ON e.id = t.empresa_id WHERE t.id = ?
  `).get(id) as Ticket | undefined) ?? null;
}

// ---------------------------------------------------------------- CLIENTES
export function listarClientes(busca?: string): Cliente[] {
  const where = busca ? "WHERE c.nome LIKE ?" : "";
  const args = busca ? [`%${busca.toUpperCase()}%`] : [];
  return getDb().prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM tickets t WHERE t.cliente_id = c.id) AS qtd_tickets,
      (SELECT COUNT(*) FROM pesagens p LEFT JOIN tickets t2 ON t2.id = p.ticket_id
        WHERE p.cliente_id = c.id OR t2.cliente_id = c.id) AS qtd_pesagens,
      (SELECT MAX(t.data_saida || ' ' || COALESCE(t.hora_saida, '')) FROM tickets t WHERE t.cliente_id = c.id) AS ultima_visita
    FROM clientes c ${where}
    ORDER BY c.nome
  `).all(...args) as Cliente[];
}

export function nomesClientes(): string[] {
  return (getDb().prepare("SELECT nome FROM clientes ORDER BY nome").all() as { nome: string }[]).map((c) => c.nome);
}

export function obterCliente(id: number): Cliente | null {
  return (getDb().prepare("SELECT * FROM clientes WHERE id = ?").get(id) as Cliente | undefined) ?? null;
}

/** Histórico completo do cliente: tickets emitidos e pesagens vinculadas. */
export function historicoCliente(id: number) {
  const db = getDb();
  const tickets = db.prepare(`
    SELECT t.*, e.nome AS empresa_nome FROM tickets t
    LEFT JOIN empresas e ON e.id = t.empresa_id
    WHERE t.cliente_id = ?
    ORDER BY t.data_saida DESC, t.hora_saida DESC, t.id DESC
  `).all(id) as Ticket[];
  const pesagens = db.prepare(`
    SELECT p.*, e.nome AS empresa_nome FROM pesagens p
    LEFT JOIN empresas e ON e.id = p.empresa_id
    LEFT JOIN tickets t ON t.id = p.ticket_id
    WHERE p.cliente_id = ? OR t.cliente_id = ?
    ORDER BY p.data DESC, p.hora DESC, p.id DESC
  `).all(id, id) as Pesagem[];
  const placas = [...new Set([...tickets.map((t) => t.placa), ...pesagens.map((p) => p.placa)])];
  const totalKg = tickets.reduce((s, t) => s + t.liquido, 0);
  const totalValor = tickets.reduce((s, t) => s + t.valor, 0);
  return { tickets, pesagens, placas, totalKg, totalValor };
}

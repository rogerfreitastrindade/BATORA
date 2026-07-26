"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getDb, getConfig, setConfig, sha256, proximoSeq, precoAvulso, resolverCliente } from "./db";
import { assinarSessao, SESSION_COOKIE, sessaoAtual, type Sessao } from "./auth";
import { sugestaoDia } from "./queries";
import { emitirTicket, type DadosTicket } from "./tickets";
import { mpConfigurado, criarCobrancaPix, criarCobrancaCartao } from "./mercadopago";

async function guard(): Promise<Sessao> {
  const s = await sessaoAtual();
  if (!s) redirect("/login");
  return s;
}

/** Só o dono (admin) pode modificar dados. Empresa logada é sempre somente-leitura. */
async function guardAdmin(): Promise<Sessao> {
  const s = await guard();
  if (s.papel !== "admin") redirect("/pesagens");
  return s;
}

// ---------------------------------------------------------------- AUTH
export async function entrar(_prev: { erro: string } | null, form: FormData) {
  const senha = String(form.get("senha") || "").trim();
  const jar = await cookies();
  const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 365 };

  // 1º: senha do dono (acesso total)
  if (senha && sha256(senha) === getConfig("senha_hash")) {
    jar.set(SESSION_COOKIE, assinarSessao("admin"), opts);
    redirect("/");
  }
  // 2º: senha única de uma empresa conveniada (acesso restrito à própria empresa)
  const empresa = senha
    ? (getDb().prepare("SELECT id FROM empresas WHERE senha = ? AND ativa = 1").get(senha) as { id: number } | undefined)
    : undefined;
  if (empresa) {
    jar.set(SESSION_COOKIE, assinarSessao("emp", empresa.id), opts);
    redirect("/pesagens");
  }
  return { erro: "Senha incorreta. Tente novamente." };
}

/** Botão da tela inicial: cliente particular (pagamento à vista) entra sem senha. */
export async function entrarParticular() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, assinarSessao("part"), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12, // 12 horas
  });
  redirect("/ticket");
}

export async function sair() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function trocarSenha(_prev: { msg?: string; erro?: string } | null, form: FormData) {
  await guardAdmin();
  const atual = String(form.get("atual") || "");
  const nova = String(form.get("nova") || "");
  if (sha256(atual) !== getConfig("senha_hash")) return { erro: "Senha atual incorreta." };
  if (nova.length < 4) return { erro: "A nova senha precisa ter pelo menos 4 caracteres." };
  setConfig("senha_hash", sha256(nova));
  return { msg: "Senha alterada com sucesso." };
}

export async function salvarAjustes(form: FormData) {
  await guardAdmin();
  const preco = parseFloat(String(form.get("preco_avulso") || "30").replace(",", "."));
  if (!isNaN(preco) && preco > 0) setConfig("preco_avulso", String(preco));
  setConfig("chave_pix", String(form.get("chave_pix") || "").trim());
  if (form.has("mp_access_token")) {
    setConfig("mp_access_token", String(form.get("mp_access_token") || "").trim());
  }
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- PESAGENS
function anoMesDe(data: string) {
  return { ano: Number(data.slice(0, 4)), mes: Number(data.slice(5, 7)) };
}

export async function criarPesagem(form: FormData) {
  await guardAdmin();
  const data = String(form.get("data") || "");
  const hora = String(form.get("hora") || "");
  const placa = String(form.get("placa") || "").toUpperCase().replace(/\s+/g, "").trim();
  const forma = String(form.get("forma") || "");
  const empresaRaw = String(form.get("empresa_id") || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !placa || !["PIX", "DINHEIRO", "MENSAL"].includes(forma)) return;
  const empresa_id = forma === "MENSAL" && empresaRaw ? Number(empresaRaw) : null;
  const cliente_id = resolverCliente(String(form.get("cliente") || ""));
  const { ano, mes } = anoMesDe(data);
  const db = getDb();
  db.prepare(
    "INSERT INTO pesagens (seq, data, hora, placa, forma, empresa_id, ano, mes, cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(proximoSeq(ano, mes), data, hora || null, placa, forma, empresa_id, ano, mes, cliente_id);
  revalidatePath("/pesagens");
  revalidatePath("/");
}

export async function atualizarPesagem(form: FormData) {
  await guardAdmin();
  const id = Number(form.get("id"));
  const data = String(form.get("data") || "");
  const hora = String(form.get("hora") || "");
  const placa = String(form.get("placa") || "").toUpperCase().replace(/\s+/g, "").trim();
  const forma = String(form.get("forma") || "");
  const empresaRaw = String(form.get("empresa_id") || "");
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(data) || !placa) return;
  const empresa_id = forma === "MENSAL" && empresaRaw ? Number(empresaRaw) : null;
  const db = getDb();
  const antiga = db.prepare("SELECT ano, mes FROM pesagens WHERE id = ?").get(id) as { ano: number; mes: number } | undefined;
  if (!antiga) return;
  const { ano, mes } = anoMesDe(data);
  const mudouMes = antiga.ano !== ano || antiga.mes !== mes;
  const cliente_id = resolverCliente(String(form.get("cliente") || ""));
  db.prepare(
    "UPDATE pesagens SET data = ?, hora = ?, placa = ?, forma = ?, empresa_id = ?, ano = ?, mes = ?, seq = ?, cliente_id = ? WHERE id = ?"
  ).run(data, hora || null, placa, forma, empresa_id, ano, mes,
    mudouMes ? proximoSeq(ano, mes) : (db.prepare("SELECT seq FROM pesagens WHERE id = ?").get(id) as { seq: number }).seq,
    cliente_id, id);
  revalidatePath("/pesagens");
  redirect("/pesagens");
}

export async function excluirPesagem(form: FormData) {
  await guardAdmin();
  const id = Number(form.get("id"));
  if (id) getDb().prepare("DELETE FROM pesagens WHERE id = ?").run(id);
  revalidatePath("/pesagens");
  revalidatePath("/");
}

// ---------------------------------------------------------------- EMPRESAS
function gerarSenhaEmpresa(db: ReturnType<typeof getDb>): string {
  let senha: string;
  do {
    senha = String(100000 + Math.floor(Math.random() * 900000));
  } while ((db.prepare("SELECT COUNT(*) AS c FROM empresas WHERE senha = ?").get(senha) as { c: number }).c > 0);
  return senha;
}

export async function criarEmpresa(form: FormData) {
  await guardAdmin();
  const nome = String(form.get("nome") || "").toUpperCase().trim();
  const valor = parseFloat(String(form.get("valor") || "30").replace(",", ".")) || 30;
  if (!nome) return;
  const db = getDb();
  const senha = String(form.get("senha") || "").trim() || gerarSenhaEmpresa(db);
  db.prepare("INSERT OR IGNORE INTO empresas (nome, valor_pesagem, ativa, senha) VALUES (?, ?, 1, ?)")
    .run(nome, valor, senha);
  revalidatePath("/empresas");
}

export async function atualizarEmpresa(form: FormData) {
  await guardAdmin();
  const id = Number(form.get("id"));
  const nome = String(form.get("nome") || "").toUpperCase().trim();
  const valor = parseFloat(String(form.get("valor") || "30").replace(",", "."));
  if (!id || !nome || isNaN(valor)) return;
  const db = getDb();
  const senha = String(form.get("senha") || "").trim() || gerarSenhaEmpresa(db);
  db.prepare("UPDATE empresas SET nome = ?, valor_pesagem = ?, senha = ? WHERE id = ?")
    .run(nome, valor, senha, id);
  revalidatePath("/empresas");
  revalidatePath("/conveniadas");
}

export async function alternarEmpresa(form: FormData) {
  await guardAdmin();
  const id = Number(form.get("id"));
  if (id) getDb().prepare("UPDATE empresas SET ativa = 1 - ativa WHERE id = ?").run(id);
  revalidatePath("/empresas");
}

// ---------------------------------------------------------------- CAIXA
export async function salvarDiaCaixa(form: FormData) {
  await guardAdmin();
  const data = String(form.get("data") || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return;
  const num = (k: string) => parseFloat(String(form.get(k) || "0").replace(",", ".")) || 0;
  getDb().prepare(`
    INSERT INTO caixa (data, inicio, entradas, pix, retiradas, obs) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(data) DO UPDATE SET inicio = excluded.inicio, entradas = excluded.entradas,
      pix = excluded.pix, retiradas = excluded.retiradas, obs = excluded.obs
  `).run(data, num("inicio"), num("entradas"), num("pix"), num("retiradas"),
    String(form.get("obs") || "").trim() || null);
  revalidatePath("/caixa");
  redirect(`/caixa?mes=${data.slice(0, 7)}`);
}

export async function lancarDiaAutomatico(form: FormData) {
  await guardAdmin();
  const data = String(form.get("data") || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return;
  const s = sugestaoDia(data);
  getDb().prepare(`
    INSERT INTO caixa (data, inicio, entradas, pix, retiradas) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(data) DO NOTHING
  `).run(data, s.inicio, s.entradas, s.pix, s.retiradas);
  revalidatePath("/caixa");
  redirect(`/caixa?mes=${data.slice(0, 7)}&editar=${data}`);
}

export async function excluirDiaCaixa(form: FormData) {
  await guardAdmin();
  const data = String(form.get("data") || "");
  if (data) getDb().prepare("DELETE FROM caixa WHERE data = ?").run(data);
  revalidatePath("/caixa");
}

// ---------------------------------------------------------------- GASTOS
export async function criarGasto(form: FormData) {
  await guardAdmin();
  const data = String(form.get("data") || "");
  const hora = String(form.get("hora") || "");
  const valor = parseFloat(String(form.get("valor") || "").replace(",", "."));
  const descricao = String(form.get("descricao") || "").toUpperCase().trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || isNaN(valor) || !descricao) return;
  getDb().prepare("INSERT INTO gastos (data, hora, valor, descricao) VALUES (?, ?, ?, ?)")
    .run(data, hora || null, valor, descricao);
  revalidatePath("/gastos");
  revalidatePath("/");
}

export async function excluirGasto(form: FormData) {
  await guardAdmin();
  const id = Number(form.get("id"));
  if (id) getDb().prepare("DELETE FROM gastos WHERE id = ?").run(id);
  revalidatePath("/gastos");
}

// ---------------------------------------------------------------- COBRANÇAS (conveniadas do mês)
export async function alternarStatusCobranca(form: FormData) {
  await guardAdmin();
  const ano = Number(form.get("ano"));
  const mes = Number(form.get("mes"));
  const empresa_id = Number(form.get("empresa_id"));
  if (!ano || !mes || !empresa_id) return;
  const db = getDb();
  const atual = db.prepare(
    "SELECT status FROM cobrancas WHERE ano = ? AND mes = ? AND empresa_id = ?"
  ).get(ano, mes, empresa_id) as { status: string } | undefined;
  const novo = atual?.status === "PAGO" ? "EM ABERTO" : "PAGO";
  const pagoEm = novo === "PAGO" ? new Date().toLocaleString("sv-SE").slice(0, 16).replace("T", " ") : null;
  db.prepare(`
    INSERT INTO cobrancas (ano, mes, empresa_id, status, pago_em) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(ano, mes, empresa_id) DO UPDATE SET status = excluded.status, pago_em = excluded.pago_em
  `).run(ano, mes, empresa_id, novo, pagoEm);
  revalidatePath("/conveniadas");
  revalidatePath("/");
}

// ---------------------------------------------------------------- TICKETS
export async function criarTicket(_prev: { erro: string } | null, form: FormData) {
  const sessao = await guard();
  const cliente = String(form.get("cliente") || "").toUpperCase().trim();
  const placa = String(form.get("placa") || "").toUpperCase().replace(/\s+/g, "").trim();
  const motorista = String(form.get("motorista") || "").toUpperCase().trim();
  const material = String(form.get("material") || "").toUpperCase().trim();
  const tara = parseFloat(String(form.get("tara") || "").replace(",", "."));
  const bruto = parseFloat(String(form.get("bruto") || "").replace(",", "."));
  const data_entrada = String(form.get("data_entrada") || "");
  const hora_entrada = String(form.get("hora_entrada") || "");
  const data_saida = String(form.get("data_saida") || "") || data_entrada;
  const hora_saida = String(form.get("hora_saida") || "");
  const empresaRaw = String(form.get("empresa_id") || "");
  const autoPdf = String(form.get("auto_pdf") || "") === "1";
  let forma = String(form.get("forma") || "DINHEIRO");
  if (!cliente || !placa || isNaN(tara) || isNaN(bruto) || !/^\d{4}-\d{2}-\d{2}$/.test(data_entrada)) {
    return { erro: "Preencha cliente, placa, tara e bruto." };
  }

  const db = getDb();
  // empresa logada só emite para ela mesma (já autenticou com a senha única no login)
  const empresa_id = sessao.papel === "emp" ? sessao.empresaId : empresaRaw ? Number(empresaRaw) : null;
  let valor = precoAvulso();
  let pago_via: string | null = null;

  if (empresa_id) {
    forma = "MENSAL";
    const e = db.prepare("SELECT nome, valor_pesagem, senha FROM empresas WHERE id = ?").get(empresa_id) as
      | { nome: string; valor_pesagem: number; senha: string | null }
      | undefined;
    if (!e) return { erro: "Empresa não encontrada." };
    valor = e.valor_pesagem;
    if (sessao.papel === "admin") {
      // dono emitindo para uma conveniada: exige a senha única da empresa
      const senhaDigitada = String(form.get("senha_empresa") || "").trim();
      if (!senhaDigitada) return { erro: `Digite a senha da ${e.nome} para emitir o ticket.` };
      if (senhaDigitada !== (e.senha || "").trim()) {
        return { erro: `Senha da ${e.nome} incorreta. Confira com a empresa e tente de novo.` };
      }
    }
  } else if (!["PIX", "DINHEIRO", "CARTAO"].includes(forma)) {
    forma = "DINHEIRO";
  }

  const dados: DadosTicket = {
    cliente, placa, motorista, material, tara, bruto,
    data_entrada, hora_entrada, data_saida, hora_saida,
    empresa_id, forma: (forma === "CARTAO" ? "PIX" : forma) as DadosTicket["forma"],
    valor, pago_via, auto_pdf: autoPdf,
  };

  // PARTICULAR com PIX ou CARTÃO: só emite depois do pagamento aprovado no Mercado Pago
  if (!empresa_id && (forma === "PIX" || forma === "CARTAO") && mpConfigurado()) {
    const ref = `batora-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const descricao = `Pesagem ${placa} - BALANCA DO BARREIRO`;
    let pagamentoId: number;
    try {
      if (forma === "PIX") {
        dados.pago_via = "MERCADOPAGO_PIX";
        const cob = await criarCobrancaPix(valor, descricao, ref);
        const r = db.prepare(`
          INSERT INTO pagamentos (tipo, valor, mp_id, external_ref, qr_code, qr_base64, link, ticket_dados)
          VALUES ('PIX', ?, ?, ?, ?, ?, ?, ?)
        `).run(valor, cob.mp_id, ref, cob.qr_code, cob.qr_base64, cob.link, JSON.stringify(dados));
        pagamentoId = Number(r.lastInsertRowid);
      } else {
        dados.pago_via = "MERCADOPAGO_CARTAO";
        const cob = await criarCobrancaCartao(valor, descricao, ref);
        const r = db.prepare(`
          INSERT INTO pagamentos (tipo, valor, mp_id, external_ref, link, ticket_dados)
          VALUES ('CARTAO', ?, ?, ?, ?, ?)
        `).run(valor, cob.mp_id, ref, cob.link, JSON.stringify(dados));
        pagamentoId = Number(r.lastInsertRowid);
      }
    } catch (e) {
      return { erro: `Não consegui gerar a cobrança no Mercado Pago: ${e instanceof Error ? e.message : "erro desconhecido"}` };
    }
    redirect(`/pagamentos/${pagamentoId}`);
  }

  // MENSAL (senha conferida), DINHEIRO, ou PIX sem Mercado Pago configurado: emite direto
  if (!empresa_id) {
    dados.pago_via = forma === "DINHEIRO" ? "DINHEIRO" : "PIX_MANUAL";
    if (forma === "CARTAO") {
      return { erro: "Para cobrar no cartão, configure o Access Token do Mercado Pago em Ajustes." };
    }
  }
  const ticketId = emitirTicket(dados);

  revalidatePath("/pesagens");
  revalidatePath("/tickets");
  revalidatePath("/");
  redirect(`/tickets/${ticketId}?novo=1${autoPdf ? "&pdf=1" : ""}`);
}

// ------------------------------------------------- SOLICITAÇÕES (empresa pede, admin lança o bruto)
export async function criarSolicitacao(_prev: { erro: string } | null, form: FormData) {
  const sessao = await guard();
  if (sessao.papel !== "emp" || !sessao.empresaId) redirect("/ticket");
  const cliente = String(form.get("cliente") || "").toUpperCase().trim();
  const placa = String(form.get("placa") || "").toUpperCase().replace(/\s+/g, "").trim();
  const motorista = String(form.get("motorista") || "").toUpperCase().trim();
  const material = String(form.get("material") || "").toUpperCase().trim();
  const tara = parseFloat(String(form.get("tara") || "").replace(",", "."));
  const data_entrada = String(form.get("data_entrada") || "");
  const hora_entrada = String(form.get("hora_entrada") || "");
  if (!cliente || !placa || isNaN(tara) || !/^\d{4}-\d{2}-\d{2}$/.test(data_entrada)) {
    return { erro: "Preencha cliente, placa e tara (peso vazio)." };
  }
  const r = getDb().prepare(`
    INSERT INTO solicitacoes (empresa_id, cliente, placa, motorista, material, tara, data_entrada, hora_entrada)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sessao.empresaId, cliente, placa, motorista || null, material || null, tara,
    data_entrada, hora_entrada || null);
  redirect(`/solicitacoes/${Number(r.lastInsertRowid)}`);
}

/** Cliente particular (botão da tela inicial) pede o ticket: paga à vista antes, bruto fica com o admin. */
export async function criarSolicitacaoParticular(_prev: { erro: string } | null, form: FormData) {
  const sessao = await guard();
  if (sessao.papel !== "part") redirect("/ticket");
  const cliente = String(form.get("cliente") || "").toUpperCase().trim();
  const placa = String(form.get("placa") || "").toUpperCase().replace(/\s+/g, "").trim();
  const motorista = String(form.get("motorista") || "").toUpperCase().trim();
  const material = String(form.get("material") || "").toUpperCase().trim();
  const tara = parseFloat(String(form.get("tara") || "").replace(",", "."));
  const data_entrada = String(form.get("data_entrada") || "");
  const hora_entrada = String(form.get("hora_entrada") || "");
  let forma = String(form.get("forma") || "PIX");
  if (!cliente || !placa || isNaN(tara) || !/^\d{4}-\d{2}-\d{2}$/.test(data_entrada)) {
    return { erro: "Preencha seu nome, a placa e a tara (peso vazio)." };
  }
  if (!["PIX", "CARTAO"].includes(forma)) forma = "PIX";
  const db = getDb();
  const valor = precoAvulso();

  if (mpConfigurado()) {
    // cria a solicitação primeiro; o QR do PIX / link do cartão aparece na tela seguinte.
    // O admin vê o pedido como "aguardando pagamento" e só consegue emitir depois de pago.
    const pagoVia = forma === "PIX" ? "MERCADOPAGO_PIX" : "MERCADOPAGO_CARTAO";
    const rSol = db.prepare(`
      INSERT INTO solicitacoes (empresa_id, cliente, placa, motorista, material, tara,
        data_entrada, hora_entrada, forma, valor, pago_via, pago)
      VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 'PIX', ?, ?, 0)
    `).run(cliente, placa, motorista || null, material || null, tara,
      data_entrada, hora_entrada || null, valor, pagoVia);
    const solId = Number(rSol.lastInsertRowid);
    const ref = `batora-sol-${solId}-${Math.random().toString(36).slice(2, 8)}`;
    const descricao = `Pesagem ${placa} - BALANCA DO BARREIRO`;
    try {
      let pagamentoId: number;
      if (forma === "PIX") {
        const cob = await criarCobrancaPix(valor, descricao, ref);
        const r = db.prepare(`
          INSERT INTO pagamentos (tipo, valor, mp_id, external_ref, qr_code, qr_base64, link, ticket_dados)
          VALUES ('PIX', ?, ?, ?, ?, ?, ?, ?)
        `).run(valor, cob.mp_id, ref, cob.qr_code, cob.qr_base64, cob.link,
          JSON.stringify({ particular: true, solicitacao_id: solId }));
        pagamentoId = Number(r.lastInsertRowid);
      } else {
        const cob = await criarCobrancaCartao(valor, descricao, ref);
        const r = db.prepare(`
          INSERT INTO pagamentos (tipo, valor, mp_id, external_ref, link, ticket_dados)
          VALUES ('CARTAO', ?, ?, ?, ?, ?)
        `).run(valor, cob.mp_id, ref, cob.link,
          JSON.stringify({ particular: true, solicitacao_id: solId }));
        pagamentoId = Number(r.lastInsertRowid);
      }
      db.prepare("UPDATE solicitacoes SET pagamento_id = ? WHERE id = ?").run(pagamentoId, solId);
    } catch (e) {
      db.prepare("DELETE FROM solicitacoes WHERE id = ?").run(solId);
      if (e && typeof e === "object" && "digest" in e) throw e; // redirect não é erro
      return { erro: `Não consegui gerar a cobrança no Mercado Pago: ${e instanceof Error ? e.message : "erro desconhecido"}` };
    }
    redirect(`/solicitacoes/${solId}`);
  }

  // sem Mercado Pago configurado: o pagamento é acertado na balança
  const r = db.prepare(`
    INSERT INTO solicitacoes (empresa_id, cliente, placa, motorista, material, tara,
      data_entrada, hora_entrada, forma, valor, pago_via)
    VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 'PIX', ?, 'NA_BALANCA')
  `).run(cliente, placa, motorista || null, material || null, tara,
    data_entrada, hora_entrada || null, valor);
  redirect(`/solicitacoes/${Number(r.lastInsertRowid)}`);
}

/** Admin lança o peso bruto lido no visor e o ticket é emitido na hora. */
export async function emitirDeSolicitacao(_prev: { erro: string } | null, form: FormData) {
  await guardAdmin();
  const id = Number(form.get("id"));
  const bruto = parseFloat(String(form.get("bruto") || "").replace(",", "."));
  if (!id || isNaN(bruto)) return { erro: "Digite o peso bruto." };
  const db = getDb();
  const s = db.prepare("SELECT * FROM solicitacoes WHERE id = ? AND status = 'AGUARDANDO'").get(id) as
    | { id: number; empresa_id: number | null; cliente: string; placa: string; motorista: string | null;
        material: string | null; tara: number; data_entrada: string; hora_entrada: string | null;
        forma: string | null; valor: number | null; pago_via: string | null;
        pagamento_id: number | null; pago: number }
    | undefined;
  if (!s) return { erro: "Solicitação não encontrada ou já atendida." };
  // particular com cobrança Mercado Pago: o ticket só é liberado depois do pagamento aprovado
  if (s.pagamento_id && !s.pago) {
    return { erro: "O cliente ainda não pagou — o ticket só pode ser emitido depois do pagamento aprovado no Mercado Pago." };
  }
  if (bruto <= s.tara) {
    return { erro: `O bruto (${bruto}) precisa ser maior que a tara (${s.tara}).` };
  }
  const e = s.empresa_id
    ? db.prepare("SELECT valor_pesagem FROM empresas WHERE id = ?").get(s.empresa_id) as
      | { valor_pesagem: number }
      | undefined
    : undefined;
  const agora = new Date();
  const dataSaida = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
  const horaSaida = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
  const ehParticular = !s.empresa_id;
  const ticketId = emitirTicket({
    cliente: s.cliente, placa: s.placa, motorista: s.motorista || "", material: s.material || "",
    tara: s.tara, bruto,
    data_entrada: s.data_entrada, hora_entrada: s.hora_entrada || "",
    data_saida: dataSaida, hora_saida: horaSaida,
    empresa_id: s.empresa_id,
    forma: ehParticular ? ((s.forma as DadosTicket["forma"]) || "PIX") : "MENSAL",
    valor: ehParticular ? (s.valor ?? precoAvulso()) : (e?.valor_pesagem ?? precoAvulso()),
    pago_via: ehParticular ? (s.pago_via === "NA_BALANCA" ? null : s.pago_via) : null,
    auto_pdf: false,
  });
  db.prepare(
    "UPDATE solicitacoes SET status = 'EMITIDO', ticket_id = ?, atendido_em = datetime('now','localtime') WHERE id = ?"
  ).run(ticketId, id);
  revalidatePath("/solicitacoes");
  revalidatePath("/pesagens");
  revalidatePath("/tickets");
  redirect(`/tickets/${ticketId}?novo=1`);
}

export async function recusarSolicitacao(form: FormData) {
  await guardAdmin();
  const id = Number(form.get("id"));
  if (id) {
    getDb().prepare(
      "UPDATE solicitacoes SET status = 'RECUSADO', atendido_em = datetime('now','localtime') WHERE id = ? AND status = 'AGUARDANDO'"
    ).run(id);
  }
  revalidatePath("/solicitacoes");
}

export async function cancelarPagamento(form: FormData) {
  await guardAdmin();
  const id = Number(form.get("id"));
  if (id) {
    getDb().prepare("UPDATE pagamentos SET status = 'CANCELADO' WHERE id = ? AND status = 'PENDENTE'").run(id);
  }
  revalidatePath("/tickets");
  redirect("/ticket");
}

// ---------------------------------------------------------------- CLIENTES
export async function criarClienteAction(form: FormData) {
  await guardAdmin();
  const nome = String(form.get("nome") || "").toUpperCase().replace(/\s+/g, " ").trim();
  if (!nome) return;
  const db = getDb();
  const id = resolverCliente(nome);
  const telefone = String(form.get("telefone") || "").trim();
  const obs = String(form.get("obs") || "").trim();
  if (id && (telefone || obs)) {
    db.prepare("UPDATE clientes SET telefone = COALESCE(NULLIF(?, ''), telefone), obs = COALESCE(NULLIF(?, ''), obs) WHERE id = ?")
      .run(telefone, obs, id);
  }
  revalidatePath("/clientes");
}

export async function atualizarCliente(form: FormData) {
  await guardAdmin();
  const id = Number(form.get("id"));
  const nome = String(form.get("nome") || "").toUpperCase().replace(/\s+/g, " ").trim();
  if (!id || !nome) return;
  const texto = (k: string) => String(form.get(k) || "").trim() || null;
  getDb().prepare(`
    UPDATE clientes SET nome = ?, telefone = ?, obs = ?, cpf_cnpj = ?, email = ?, contato = ?,
      rua = ?, numero = ?, bairro = ?, cidade = ?, estado = ?
    WHERE id = ?
  `).run(nome, texto("telefone"), texto("obs"), texto("cpf_cnpj"),
    texto("email"), texto("contato")?.toUpperCase() ?? null,
    texto("rua"), texto("numero"), texto("bairro"), texto("cidade"),
    texto("estado")?.toUpperCase() ?? null, id);
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
}

export async function excluirCliente(form: FormData) {
  await guardAdmin();
  const id = Number(form.get("id"));
  if (!id) return;
  const db = getDb();
  // não apaga o histórico: só desvincula
  db.prepare("UPDATE pesagens SET cliente_id = NULL WHERE cliente_id = ?").run(id);
  db.prepare("UPDATE tickets SET cliente_id = NULL WHERE cliente_id = ?").run(id);
  db.prepare("DELETE FROM clientes WHERE id = ?").run(id);
  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function excluirTicket(form: FormData) {
  await guardAdmin();
  const id = Number(form.get("id"));
  if (!id) return;
  const db = getDb();
  db.prepare("DELETE FROM pesagens WHERE ticket_id = ?").run(id);
  db.prepare("DELETE FROM tickets WHERE id = ?").run(id);
  revalidatePath("/tickets");
  revalidatePath("/pesagens");
}

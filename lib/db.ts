import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "data", "batora.db");
const SEED_PATH = path.join(process.cwd(), "data", "seed", "seed.json");

let _db: Database.Database | null = null;

export function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function createSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS empresas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      valor_pesagem REAL NOT NULL DEFAULT 30.0,
      ativa INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS pesagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seq INTEGER NOT NULL,
      data TEXT NOT NULL,
      hora TEXT,
      placa TEXT NOT NULL,
      forma TEXT NOT NULL CHECK (forma IN ('PIX','DINHEIRO','MENSAL')),
      empresa_id INTEGER REFERENCES empresas(id),
      ano INTEGER NOT NULL,
      mes INTEGER NOT NULL,
      ticket_id INTEGER,
      criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_pesagens_anomes ON pesagens (ano, mes);
    CREATE INDEX IF NOT EXISTS idx_pesagens_placa ON pesagens (placa);
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente TEXT NOT NULL,
      placa TEXT NOT NULL,
      motorista TEXT,
      material TEXT,
      tara REAL NOT NULL,
      bruto REAL NOT NULL,
      liquido REAL NOT NULL,
      data_entrada TEXT NOT NULL,
      hora_entrada TEXT,
      data_saida TEXT NOT NULL,
      hora_saida TEXT,
      empresa_id INTEGER REFERENCES empresas(id),
      forma TEXT NOT NULL CHECK (forma IN ('PIX','DINHEIRO','MENSAL')),
      valor REAL NOT NULL DEFAULT 30.0,
      criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS caixa (
      data TEXT PRIMARY KEY,
      inicio REAL NOT NULL DEFAULT 0,
      entradas REAL NOT NULL DEFAULT 0,
      pix REAL NOT NULL DEFAULT 0,
      retiradas REAL NOT NULL DEFAULT 0,
      obs TEXT
    );
    CREATE TABLE IF NOT EXISTS gastos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      valor REAL NOT NULL,
      descricao TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cobrancas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ano INTEGER NOT NULL,
      mes INTEGER NOT NULL,
      empresa_id INTEGER NOT NULL REFERENCES empresas(id),
      valor_manual REAL,
      status TEXT NOT NULL DEFAULT 'EM ABERTO' CHECK (status IN ('PAGO','EM ABERTO')),
      obs TEXT,
      UNIQUE (ano, mes, empresa_id)
    );
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      telefone TEXT,
      obs TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS solicitacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER REFERENCES empresas(id), -- NULL = cliente particular
      cliente TEXT NOT NULL,
      placa TEXT NOT NULL,
      motorista TEXT,
      material TEXT,
      tara REAL NOT NULL,
      data_entrada TEXT NOT NULL,
      hora_entrada TEXT,
      status TEXT NOT NULL DEFAULT 'AGUARDANDO' CHECK (status IN ('AGUARDANDO','EMITIDO','RECUSADO')),
      ticket_id INTEGER,
      forma TEXT,
      valor REAL,
      pago_via TEXT,
      pagamento_id INTEGER,
      pago INTEGER NOT NULL DEFAULT 0,
      pago_em TEXT,
      criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      atendido_em TEXT
    );
    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT NOT NULL CHECK (tipo IN ('PIX','CARTAO')),
      valor REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','APROVADO','CANCELADO','ERRO')),
      mp_id TEXT,
      external_ref TEXT,
      qr_code TEXT,
      qr_base64 TEXT,
      link TEXT,
      ticket_dados TEXT NOT NULL,
      ticket_id INTEGER,
      criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      aprovado_em TEXT
    );
  `);
  migrar(db);
}

function ensureColumn(db: Database.Database, tabela: string, coluna: string, ddl: string) {
  const cols = (db.prepare(`PRAGMA table_info(${tabela})`).all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes(coluna)) db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${ddl}`);
}

/** Migrações para bancos já criados em versões anteriores. */
function migrar(db: Database.Database) {
  ensureColumn(db, "gastos", "hora", "hora TEXT");
  ensureColumn(db, "cobrancas", "pago_em", "pago_em TEXT");
  ensureColumn(db, "pesagens", "cliente_id", "cliente_id INTEGER REFERENCES clientes(id)");
  ensureColumn(db, "tickets", "cliente_id", "cliente_id INTEGER REFERENCES clientes(id)");
  ensureColumn(db, "tickets", "pago_via", "pago_via TEXT");
  ensureColumn(db, "empresas", "senha", "senha TEXT");
  ensureColumn(db, "clientes", "cpf_cnpj", "cpf_cnpj TEXT");
  ensureColumn(db, "clientes", "endereco", "endereco TEXT");
  ensureColumn(db, "clientes", "rua", "rua TEXT");
  ensureColumn(db, "clientes", "numero", "numero TEXT");
  ensureColumn(db, "clientes", "bairro", "bairro TEXT");
  ensureColumn(db, "clientes", "cidade", "cidade TEXT");
  ensureColumn(db, "clientes", "estado", "estado TEXT");
  ensureColumn(db, "clientes", "email", "email TEXT");
  ensureColumn(db, "clientes", "contato", "contato TEXT");
  ensureColumn(db, "solicitacoes", "forma", "forma TEXT");
  ensureColumn(db, "solicitacoes", "valor", "valor REAL");
  ensureColumn(db, "solicitacoes", "pago_via", "pago_via TEXT");
  // solicitações de particulares não têm empresa: remove o NOT NULL de empresa_id (bancos antigos)
  const infoEmp = (db.prepare("PRAGMA table_info(solicitacoes)").all() as
    { name: string; notnull: number }[]).find((c) => c.name === "empresa_id");
  if (infoEmp && infoEmp.notnull === 1) {
    db.exec(`
      ALTER TABLE solicitacoes RENAME TO solicitacoes_old;
      CREATE TABLE solicitacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER REFERENCES empresas(id),
        cliente TEXT NOT NULL,
        placa TEXT NOT NULL,
        motorista TEXT,
        material TEXT,
        tara REAL NOT NULL,
        data_entrada TEXT NOT NULL,
        hora_entrada TEXT,
        status TEXT NOT NULL DEFAULT 'AGUARDANDO' CHECK (status IN ('AGUARDANDO','EMITIDO','RECUSADO')),
        ticket_id INTEGER,
        forma TEXT,
        valor REAL,
        pago_via TEXT,
        criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        atendido_em TEXT
      );
      INSERT INTO solicitacoes (id, empresa_id, cliente, placa, motorista, material, tara,
        data_entrada, hora_entrada, status, ticket_id, forma, valor, pago_via, criado_em, atendido_em)
      SELECT id, empresa_id, cliente, placa, motorista, material, tara,
        data_entrada, hora_entrada, status, ticket_id, forma, valor, pago_via, criado_em, atendido_em
      FROM solicitacoes_old;
      DROP TABLE solicitacoes_old;
    `);
  }
  // vínculo com o pagamento Mercado Pago (depois do rebuild, para não perder as colunas)
  ensureColumn(db, "solicitacoes", "pagamento_id", "pagamento_id INTEGER");
  ensureColumn(db, "solicitacoes", "pago", "pago INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "solicitacoes", "pago_em", "pago_em TEXT");
  
  // cada conveniada ganha uma senha única de 6 dígitos (editável na tela Empresas)
  const semSenha = db.prepare(
    "SELECT id FROM empresas WHERE senha IS NULL OR TRIM(senha) = ''"
  ).all() as { id: number }[];
  if (semSenha.length) {
    const upd = db.prepare("UPDATE empresas SET senha = ? WHERE id = ?");
    const existe = db.prepare("SELECT COUNT(*) AS c FROM empresas WHERE senha = ?");
    const tx = db.transaction(() => {
      for (const e of semSenha) {
        let senha: string;
        do {
          senha = String(crypto.randomInt(100000, 1000000));
        } while ((existe.get(senha) as { c: number }).c > 0);
        upd.run(senha, e.id);
      }
    });
    tx();
  }
  // cadastra automaticamente os clientes que já apareceram em tickets e vincula
  const pendentes = db.prepare(
    "SELECT DISTINCT TRIM(cliente) AS nome FROM tickets WHERE cliente_id IS NULL AND TRIM(COALESCE(cliente,'')) <> ''"
  ).all() as { nome: string }[];
  if (pendentes.length) {
    const ins = db.prepare("INSERT OR IGNORE INTO clientes (nome) VALUES (?)");
    const vincula = db.prepare(
      "UPDATE tickets SET cliente_id = (SELECT id FROM clientes WHERE nome = UPPER(TRIM(tickets.cliente))) WHERE cliente_id IS NULL"
    );
    const tx = db.transaction(() => {
      for (const p of pendentes) ins.run(p.nome.toUpperCase());
      vincula.run();
    });
    tx();
  }
}

function seed(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) AS c FROM empresas").get() as { c: number };
  if (count.c > 0) return;
  if (!fs.existsSync(SEED_PATH)) {
    // sem seed: apenas config básica
    initConfig(db);
    return;
  }
  const data = JSON.parse(fs.readFileSync(SEED_PATH, "utf-8"));
  const tx = db.transaction(() => {
    initConfig(db);
    const insEmpresa = db.prepare(
      "INSERT OR IGNORE INTO empresas (nome, valor_pesagem, ativa) VALUES (?, ?, 1)"
    );
    for (const e of data.empresas) insEmpresa.run(e.nome, e.valor);
    const empresaId = new Map<string, number>();
    for (const row of db.prepare("SELECT id, nome FROM empresas").all() as { id: number; nome: string }[]) {
      empresaId.set(row.nome, row.id);
    }
    const insPes = db.prepare(
      `INSERT INTO pesagens (seq, data, hora, placa, forma, empresa_id, ano, mes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const p of data.pesagens) {
      const eid = p.empresa && p.empresa !== "PARTICULAR" ? empresaId.get(p.empresa) ?? null : null;
      insPes.run(p.seq, p.data, p.hora, p.placa, p.forma, eid, p.ano, p.mes);
    }
    const insCaixa = db.prepare(
      "INSERT OR IGNORE INTO caixa (data, inicio, entradas, pix, retiradas) VALUES (?, ?, ?, ?, ?)"
    );
    for (const c of data.caixa) insCaixa.run(c.data, c.inicio, c.entradas, c.pix, c.retiradas);
    const insGasto = db.prepare("INSERT INTO gastos (data, valor, descricao) VALUES (?, ?, ?)");
    for (const g of data.gastos) insGasto.run(g.data, g.valor, g.descricao);
    const insCob = db.prepare(
      `INSERT OR IGNORE INTO cobrancas (ano, mes, empresa_id, valor_manual, status, obs)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const c of data.cobrancas) {
      const eid = empresaId.get(c.empresa);
      if (!eid) continue;
      insCob.run(c.ano, c.mes, eid, c.valor, c.status, c.obs || null);
    }
    const insTicket = db.prepare(
      `INSERT INTO tickets (cliente, placa, motorista, material, tara, bruto, liquido,
        data_entrada, hora_entrada, data_saida, hora_saida, empresa_id, forma, valor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const t of data.tickets) {
      const eid = empresaId.get(t.cliente?.trim?.().toUpperCase?.() || "") ?? null;
      insTicket.run(
        t.cliente, t.placa, t.motorista, t.material, t.tara, t.bruto, t.liquido,
        t.data, t.hora_entrada, t.data, t.hora_saida, eid,
        eid ? "MENSAL" : "DINHEIRO", t.valor || 30
      );
    }
  });
  tx();
}

function initConfig(db: Database.Database) {
  const ins = db.prepare("INSERT OR IGNORE INTO config (chave, valor) VALUES (?, ?)");
  ins.run("senha_hash", sha256("batora2026"));
  ins.run("preco_avulso", "30");
  ins.run("chave_pix", "");
}

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  createSchema(_db);
  seed(_db);
  return _db;
}

export function getConfig(chave: string): string {
  const row = getDb().prepare("SELECT valor FROM config WHERE chave = ?").get(chave) as
    | { valor: string }
    | undefined;
  return row?.valor ?? "";
}

export function setConfig(chave: string, valor: string) {
  getDb()
    .prepare("INSERT INTO config (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor")
    .run(chave, valor);
}

export function precoAvulso(): number {
  return parseFloat(getConfig("preco_avulso") || "30") || 30;
}

/** Busca o cliente pelo nome (sem diferenciar maiúsculas); cadastra automaticamente se for novo. */
export function resolverCliente(nome: string): number | null {
  const n = nome.replace(/\s+/g, " ").trim().toUpperCase();
  if (!n) return null;
  const db = getDb();
  const existente = db.prepare("SELECT id FROM clientes WHERE UPPER(nome) = ?").get(n) as { id: number } | undefined;
  if (existente) return existente.id;
  const r = db.prepare("INSERT INTO clientes (nome) VALUES (?)").run(n);
  return Number(r.lastInsertRowid);
}

/** Próximo número sequencial do mês (reinicia em 01 todo mês). */
export function proximoSeq(ano: number, mes: number): number {
  const row = getDb()
    .prepare("SELECT COALESCE(MAX(seq), 0) AS m FROM pesagens WHERE ano = ? AND mes = ?")
    .get(ano, mes) as { m: number };
  return row.m + 1;
}

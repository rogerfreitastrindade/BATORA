#!/usr/bin/env python3
"""Extrai dados históricos das planilhas BALANCA IRC BRASIL.xlsx e TICKET TERCEIROS 2022.xlsx
para JSON de seed do banco SQLite do BATORA."""
import openpyxl, json, re, datetime, unicodedata

SRC = "/Users/patodonald/Downloads/TransferNow-202607230q0emSDr"
OUT = "/Users/patodonald/Documents/PROJETOS/BATORA/data/seed"

FORMAS = {"PIX", "DINHEIRO", "MENSAL"}
MONTH_YEAR = {
    "AGOSTO": (2024, 8), "SETEMBRO": (2024, 9), "OUTUBRO": (2024, 10),
    "NOVEMBRO": (2024, 11), "DEZEMBRO": (2024, 12), "JANEIRO": (2025, 1),
    "FEVEREIRO": (2025, 2), "MARÇO": (2025, 3), "ABRIL": (2025, 4),
}
MONTH_NUM = {"JANEIRO":1,"FEVEREIRO":2,"MARÇO":3,"MARCO":3,"ABRIL":4,"MAIO":5,"JUNHO":6,
             "JULHO":7,"AGOSTO":8,"SETEMBRO":9,"OUTUBRO":10,"NOVEMBRO":11,"DEZEMBRO":12}

def norm(s):
    if s is None: return ""
    return re.sub(r"\s+", " ", str(s)).strip().upper()

def as_date(v):
    if isinstance(v, datetime.datetime): return v.date().isoformat()
    if isinstance(v, datetime.date): return v.isoformat()
    if isinstance(v, str):
        s = v.strip()
        m = re.match(r"^(\d{1,2})[./](\d{1,2})[./](\d{4})$", s)
        if m:
            d, mo, y = map(int, m.groups())
            try: return datetime.date(y, mo, d).isoformat()
            except ValueError: return None
    return None

def as_time(v):
    if isinstance(v, datetime.time): return v.strftime("%H:%M")
    if isinstance(v, datetime.datetime): return v.strftime("%H:%M")
    if isinstance(v, str):
        m = re.match(r"^(\d{1,2}):(\d{2})", v.strip())
        if m: return f"{int(m.group(1)):02d}:{m.group(2)}"
    return None

def as_num(v):
    if isinstance(v, (int, float)): return round(float(v), 2)
    if isinstance(v, str):
        s = v.strip().replace("R$", "").replace(" ", "")
        if not s: return None
        s = s.replace(".", "").replace(",", ".") if ("," in s) else s
        try: return round(float(s), 2)
        except ValueError: return None
    return None

# ---------------------------------------------------------------- PESAGENS
wb = openpyxl.load_workbook(f"{SRC}/BALANCA IRC BRASIL.xlsx", data_only=True)
pesagens = []
for sheet, (year, month) in MONTH_YEAR.items():
    ws = wb[sheet]
    for row in ws.iter_rows(min_row=3, max_row=ws.max_row, min_col=2, max_col=7):
        seq, data, hora, placa, forma, empresa = [c.value for c in row]
        d = as_date(data)
        placa_n = norm(placa)
        if not d or not placa_n:
            continue  # linha pré-numerada vazia
        forma_n = norm(forma)
        empresa_n = norm(empresa)
        if forma_n == "MENSAL PR":
            forma_n, empresa_n = "MENSAL", empresa_n or "PORTO REAL"
        if forma_n and forma_n not in FORMAS:
            # nome de empresa digitado na coluna de forma (padrão das abas de 2024)
            empresa_n = empresa_n or forma_n
            forma_n = "MENSAL"
        if not forma_n:
            forma_n = "MENSAL" if empresa_n and empresa_n != "PARTICULAR" else "DINHEIRO"
        if not empresa_n:
            empresa_n = "PARTICULAR" if forma_n in ("PIX", "DINHEIRO") else ""
        try: seq_i = int(str(seq).strip())
        except (ValueError, TypeError): seq_i = None
        pesagens.append({"seq": seq_i, "data": d, "hora": as_time(hora),
                         "placa": placa_n, "forma": forma_n, "empresa": empresa_n,
                         "ano": year, "mes": month})

# normalização de nomes de empresa (abreviações usadas nas abas de 2024)
EMPRESA_MAP = {
    "MENSAL GP": "GP PEDRAS", "MENSAL AL": "ALEXANDRE", "MENSAL A": "ALEXANDRE",
    "MENSAL CPX": "CPX", "MENSAL S S": "SANTO SUL", "MENSAL SS": "SANTO SUL",
    "JUNINHO/ELTON": "JUNINHO / ELTON", "JUNINHO / ELTON - ROBSON": "JUNINHO / ELTON",
    "MINAS CAL": "MINAS CALL", "PARTICULAR - JADIR": "PARTICULAR",
}
for p in pesagens:
    p["empresa"] = EMPRESA_MAP.get(p["empresa"], p["empresa"])

# renumera por mês na ordem original preservando seq quando existir
from collections import defaultdict
by_month = defaultdict(list)
for p in pesagens: by_month[(p["ano"], p["mes"])].append(p)
final_pes = []
for key in sorted(by_month):
    rows = by_month[key]
    for i, p in enumerate(rows, 1):
        p["seq"] = p["seq"] or i
        final_pes.append(p)

# ---------------------------------------------------------------- CAIXA + GASTOS
caixa, gastos = [], []
seen_caixa = set()

def scan_caixa(ws, has_total_dia):
    for row in ws.iter_rows(min_row=1, max_row=ws.max_row, min_col=1, max_col=7):
        a = row[0].value
        d = as_date(a)
        if not d or not isinstance(a, (datetime.date, datetime.datetime)):
            continue
        inicio, entradas, retiradas, pix = (as_num(row[i].value) for i in range(1, 5))
        if inicio is None and entradas is None and retiradas is None and pix is None:
            continue
        if d in seen_caixa:
            continue
        seen_caixa.add(d)
        caixa.append({"data": d, "inicio": inicio or 0, "entradas": entradas or 0,
                      "retiradas": retiradas or 0, "pix": pix or 0})

def scan_gastos(ws, col_sets):
    for r in range(1, ws.max_row + 1):
        for cols in col_sets:
            c1, c2, c3 = (ws.cell(row=r, column=c).value for c in cols)
            d = as_date(c1)
            v = as_num(c2)
            desc = norm(c3)
            if d and v is not None and desc and not re.match(r"^\d", desc):
                gastos.append({"data": d, "valor": v, "descricao": desc})
                break

scan_caixa(wb["2024"], False)
scan_caixa(wb["FECHAMENTO DE CAIXA"], True)
scan_gastos(wb["2024"], [(10, 11, 12), (9, 10, 11)])   # J/K/L e I/J/K
scan_gastos(wb["FECHAMENTO DE CAIXA"], [(9, 10, 11)])  # I/J/K

# dedup gastos
seen_g = set(); gastos_f = []
for g in gastos:
    k = (g["data"], g["valor"], g["descricao"])
    if k not in seen_g:
        seen_g.add(k); gastos_f.append(g)

# ---------------------------------------------------------------- COBRANÇAS MENSAIS (painéis conveniadas)
cobrancas = []
ws = wb["FECHAMENTO DE CAIXA"]
cur = None
for r in range(1, ws.max_row + 1):
    i_val = norm(ws.cell(row=r, column=9).value)
    if not i_val: continue
    if i_val in MONTH_NUM:
        m = MONTH_NUM[i_val]
        y = 2024 if m == 12 else 2025
        cur = (y, m); continue
    if cur and i_val not in ("TOTAL",) and not i_val.startswith("OBSERV") and not as_date(i_val):
        v = as_num(ws.cell(row=r, column=10).value)
        status = norm(ws.cell(row=r, column=11).value)
        if v is not None:
            pago = status.startswith("PAGO") or status == "ENVIADO"
            cobrancas.append({"ano": cur[0], "mes": cur[1], "empresa": i_val,
                              "valor": v, "status": "PAGO" if pago else "EM ABERTO",
                              "obs": status if status and not status.startswith("PAGO") else ""})
    if i_val == "TOTAL":
        cur = None

# ---------------------------------------------------------------- TICKETS
wbt = openpyxl.load_workbook(f"{SRC}/TICKET TERCEIROS 2022.xlsx", data_only=True)
def field(ws, coord, label):
    v = ws[coord].value
    if v is None: return ""
    s = re.sub(r"\s+", " ", str(v)).strip()
    s = re.sub(rf"^{label}\s*:\s*", "", s, flags=re.I)
    return s.strip()

tickets = []
for name in wbt.sheetnames:
    ws = wbt[name]
    tara = as_num(ws["C10"].value)
    bruto = as_num(ws["H10"].value)
    if tara is None and bruto is None: continue
    tickets.append({
        "aba": name,
        "cliente": field(ws, "B14", "CLIENTE"),
        "placa": field(ws, "B16", "PLACA"),
        "motorista": field(ws, "B18", "MOTORISTA"),
        "material": field(ws, "B20", "MATERIAL"),
        "tara": tara or 0, "bruto": bruto or 0,
        "liquido": round((bruto or 0) - (tara or 0), 2),
        "hora_entrada": as_time(ws["C9"].value),
        "hora_saida": as_time(ws["H9"].value),
        "data": "2025-06-05",  # NOW() recalculado na planilha — única data disponível
        "valor": as_num(ws["B24"].value) or as_num(ws["B22"].value) or 0,
    })

# ---------------------------------------------------------------- EMPRESAS
EMPRESAS_PEDIDAS = ["MIMETAL", "JUNINHO / ELTON", "ROBSON", "MINEIRAÇÃO SIQUEIRA",
    "MINEIRAÇÃO CALÇADÃO", "GP PEDRAS", "TCI", "MADE IN BRASIL", "CPX",
    "ALEXANDRE", "SANTO SUL", "MIL METAIS", "GH TRANSPORTES"]
extras = set()
for p in final_pes:
    e = p["empresa"]
    if e and e != "PARTICULAR" and e not in EMPRESAS_PEDIDAS:
        extras.add(e)
for c in cobrancas:
    if c["empresa"] not in EMPRESAS_PEDIDAS:
        extras.add(c["empresa"])
empresas = [{"nome": n, "valor": 30.0} for n in EMPRESAS_PEDIDAS] + \
           [{"nome": n, "valor": 30.0} for n in sorted(extras)]

out = {"pesagens": final_pes, "caixa": sorted(caixa, key=lambda c: c["data"]),
       "gastos": sorted(gastos_f, key=lambda g: g["data"]),
       "cobrancas": cobrancas, "tickets": tickets, "empresas": empresas}
with open(f"{OUT}/seed.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)

print(f"pesagens={len(final_pes)} caixa={len(caixa)} gastos={len(gastos_f)} "
      f"cobrancas={len(cobrancas)} tickets={len(tickets)} empresas={len(empresas)}")
print("empresas extras:", sorted(extras))
formas = defaultdict(int)
for p in final_pes: formas[p["forma"]] += 1
print("formas:", dict(formas))
meses = sorted({(p['ano'], p['mes']) for p in final_pes})
print("meses:", meses)

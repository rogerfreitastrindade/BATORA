export const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtNum(v: number): string {
  return v.toLocaleString("pt-BR");
}

/** 'YYYY-MM-DD' -> 'dd/mm/aaaa' */
export function fmtData(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function fmtMesAno(ano: number, mes: number): string {
  return `${MESES[mes - 1]}/${ano}`;
}

/** Data local de hoje como 'YYYY-MM-DD' */
export function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function agoraHora(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** 'YYYY-MM' do mês atual */
export function mesAtualISO(): string {
  return hojeISO().slice(0, 7);
}

export function parseMesParam(param: string | undefined): { ano: number; mes: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(param || "");
  if (m) return { ano: Number(m[1]), mes: Number(m[2]) };
  const hoje = hojeISO();
  return { ano: Number(hoje.slice(0, 4)), mes: Number(hoje.slice(5, 7)) };
}

/** lista de meses (ano, mes) do mais recente ao mais antigo, a partir dos existentes no banco + mês atual */
export function mesISO(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

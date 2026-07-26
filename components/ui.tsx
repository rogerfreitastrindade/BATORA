import Link from "next/link";
import { fmtMesAno, mesISO } from "@/lib/format";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Titulo({ children, acao }: { children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{children}</h1>
      {acao}
    </div>
  );
}

export function Cartao({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-superficie border border-borda rounded-2xl ${className}`}>{children}</div>
  );
}

export function Indicador({
  rotulo, valor, detalhe, destaque = false,
}: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 lg:p-5 ${destaque ? "bg-primaria-forte border-primaria" : "bg-superficie border-borda"}`}>
      <p className={`text-xs uppercase tracking-wider font-semibold ${destaque ? "text-blue-200" : "text-suave"}`}>{rotulo}</p>
      <p className="num text-2xl lg:text-3xl font-bold mt-1 break-words">{valor}</p>
      {detalhe && <p className={`text-sm mt-1 ${destaque ? "text-blue-200" : "text-suave"}`}>{detalhe}</p>}
    </div>
  );
}

/** Navegação de mês via querystring (?mes=YYYY-MM) preservando demais parâmetros. */
export function SeletorMes({
  base, ano, mes, params = {},
}: { base: string; ano: number; mes: number; params?: Record<string, string> }) {
  const ant = mes === 1 ? { ano: ano - 1, mes: 12 } : { ano, mes: mes - 1 };
  const prox = mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
  const url = (a: number, m: number) => {
    const q = new URLSearchParams({ ...params, mes: mesISO(a, m) });
    return `${base}?${q}`;
  };
  return (
    <div className="flex items-center gap-1 bg-superficie border border-borda rounded-xl p-1">
      <Link href={url(ant.ano, ant.mes)} aria-label="Mês anterior"
        className="w-11 h-11 flex items-center justify-center rounded-lg text-suave hover:text-texto hover:bg-superficie-2 transition-colors duration-200 cursor-pointer">
        <ChevronLeft className="w-5 h-5" aria-hidden />
      </Link>
      <span className="px-3 font-semibold min-w-36 text-center">{fmtMesAno(ano, mes)}</span>
      <Link href={url(prox.ano, prox.mes)} aria-label="Próximo mês"
        className="w-11 h-11 flex items-center justify-center rounded-lg text-suave hover:text-texto hover:bg-superficie-2 transition-colors duration-200 cursor-pointer">
        <ChevronRight className="w-5 h-5" aria-hidden />
      </Link>
    </div>
  );
}

export function Tabela({ cab, children }: { cab: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-borda">
      <table className="w-full text-sm min-w-max">
        <thead>
          <tr className="bg-superficie-2 text-left">
            {cab.map((c) => (
              <th key={c} className="px-4 py-3 font-semibold text-suave uppercase text-xs tracking-wider whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-superficie divide-y divide-borda">{children}</tbody>
      </table>
    </div>
  );
}

export function EtiquetaForma({ forma }: { forma: string }) {
  const cores: Record<string, string> = {
    PIX: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    DINHEIRO: "bg-ok/15 text-green-300 border-ok/30",
    MENSAL: "bg-primaria/15 text-blue-300 border-primaria/30",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md border text-xs font-semibold ${cores[forma] ?? "bg-superficie-2 text-suave border-borda"}`}>
      {forma}
    </span>
  );
}

export function EtiquetaStatus({ status }: { status: string }) {
  return status === "PAGO" ? (
    <span className="inline-block px-2.5 py-1 rounded-md bg-ok/15 border border-ok/30 text-green-300 text-xs font-bold">PAGO</span>
  ) : (
    <span className="inline-block px-2.5 py-1 rounded-md bg-cta/15 border border-cta/40 text-amber-300 text-xs font-bold">EM ABERTO</span>
  );
}

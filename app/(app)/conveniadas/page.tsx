import { painelConveniadas } from "@/lib/queries";
import { alternarStatusCobranca } from "@/lib/actions";
import { fmtBRL, fmtNum, fmtData, fmtMesAno, parseMesParam, mesISO } from "@/lib/format";
import { Titulo, SeletorMes, Tabela, EtiquetaStatus, Indicador } from "@/components/ui";
import Link from "next/link";
import { CheckCircle2, RotateCcw } from "lucide-react";

import { exigirAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Conveniadas({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await exigirAdmin();
  const sp = await searchParams;
  const { ano, mes } = parseMesParam(sp.mes);
  const linhas = painelConveniadas(ano, mes);
  const total = linhas.reduce((s, l) => s + l.total, 0);
  const pago = linhas.filter((l) => l.status === "PAGO").reduce((s, l) => s + l.total, 0);

  return (
    <>
      <Titulo acao={<SeletorMes base="/conveniadas" ano={ano} mes={mes} />}>
        Conveniadas — {fmtMesAno(ano, mes)}
      </Titulo>

      <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-6">
        <Indicador rotulo="Total a cobrar" valor={fmtBRL(total)} />
        <Indicador rotulo="Recebido" valor={fmtBRL(pago)} />
        <Indicador rotulo="Em aberto" valor={fmtBRL(total - pago)} destaque />
      </div>

      {/* celular: um cartão por empresa */}
      <div className="md:hidden flex flex-col gap-3">
        {linhas.length === 0 && (
          <div className="bg-superficie border border-borda rounded-xl p-5 text-center text-suave">
            Nenhuma pesagem de conveniada neste mês.
          </div>
        )}
        {linhas.map((l) => (
          <div key={l.empresa_id} className="bg-superficie border border-borda rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <Link href={`/pesagens?mes=${mesISO(ano, mes)}&empresa=${l.empresa_id}`}
                className="font-bold cursor-pointer hover:text-primaria transition-colors duration-150 truncate">
                {l.nome}
              </Link>
              <EtiquetaStatus status={l.status} />
            </div>
            {l.status === "PAGO" && l.pago_em && (
              <p className="text-xs text-green-300/80 num mb-1">
                Pago em {fmtData(l.pago_em.slice(0, 10))} às {l.pago_em.slice(11, 16)}
              </p>
            )}
            <p className="text-suave text-sm num">
              {fmtNum(l.qtd)} pesagens × {fmtBRL(l.valor_pesagem)}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-suave uppercase font-semibold">Total a cobrar</p>
                <p className="num font-bold text-lg text-amber-300">{fmtBRL(l.total)}</p>
                {l.valor_manual !== null && l.valor_manual !== l.total_calculado && (
                  <p className="text-xs text-suave">valor importado da planilha</p>
                )}
              </div>
              <form action={alternarStatusCobranca}>
                <input type="hidden" name="ano" value={ano} />
                <input type="hidden" name="mes" value={mes} />
                <input type="hidden" name="empresa_id" value={l.empresa_id} />
                <button type="submit"
                  className={`h-11 px-4 rounded-lg flex items-center gap-2 text-sm font-bold cursor-pointer transition-colors duration-200 ${
                    l.status === "PAGO"
                      ? "border border-borda text-suave hover:text-texto"
                      : "bg-ok text-green-950 hover:bg-green-400"
                  }`}>
                  {l.status === "PAGO"
                    ? (<><RotateCcw className="w-4 h-4" aria-hidden /> Reabrir</>)
                    : (<><CheckCircle2 className="w-4 h-4" aria-hidden /> Marcar pago</>)}
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
      <Tabela cab={["Empresa", "Pesagens", "Valor unitário", "Total a cobrar", "Status", ""]}>
        {linhas.length === 0 && (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-suave">
              Nenhuma pesagem de conveniada neste mês.
            </td>
          </tr>
        )}
        {linhas.map((l) => (
          <tr key={l.empresa_id} className="hover:bg-superficie-2 transition-colors duration-150">
            <td className="px-4 py-2.5 font-semibold">
              <Link href={`/pesagens?mes=${mesISO(ano, mes)}&empresa=${l.empresa_id}`}
                className="cursor-pointer hover:text-primaria hover:underline transition-colors duration-150">
                {l.nome}
              </Link>
            </td>
            <td className="px-4 py-2.5 num">{fmtNum(l.qtd)}</td>
            <td className="px-4 py-2.5 num">{fmtBRL(l.valor_pesagem)}</td>
            <td className="px-4 py-2.5 num font-bold">
              {fmtBRL(l.total)}
              {l.valor_manual !== null && l.valor_manual !== l.total_calculado && (
                <span className="block text-xs font-normal text-suave">valor importado da planilha</span>
              )}
            </td>
            <td className="px-4 py-2.5">
              <EtiquetaStatus status={l.status} />
              {l.status === "PAGO" && l.pago_em && (
                <span className="block text-xs text-green-300/80 num mt-1">
                  em {fmtData(l.pago_em.slice(0, 10))} às {l.pago_em.slice(11, 16)}
                </span>
              )}
            </td>
            <td className="px-4 py-2.5">
              <form action={alternarStatusCobranca}>
                <input type="hidden" name="ano" value={ano} />
                <input type="hidden" name="mes" value={mes} />
                <input type="hidden" name="empresa_id" value={l.empresa_id} />
                <button type="submit"
                  className={`h-11 px-3 rounded-lg flex items-center gap-2 text-sm font-bold cursor-pointer transition-colors duration-200 ${
                    l.status === "PAGO"
                      ? "border border-borda text-suave hover:text-texto"
                      : "bg-ok text-green-950 hover:bg-green-400"
                  }`}>
                  {l.status === "PAGO"
                    ? (<><RotateCcw className="w-4 h-4" aria-hidden /> Reabrir</>)
                    : (<><CheckCircle2 className="w-4 h-4" aria-hidden /> Marcar pago</>)}
                </button>
              </form>
            </td>
          </tr>
        ))}
        {linhas.length > 0 && (
          <tr className="bg-superficie-2 font-bold">
            <td className="px-4 py-3">TOTAL</td>
            <td className="px-4 py-3 num">{fmtNum(linhas.reduce((s, l) => s + l.qtd, 0))}</td>
            <td />
            <td className="px-4 py-3 num text-amber-300">{fmtBRL(total)}</td>
            <td colSpan={2} />
          </tr>
        )}
      </Tabela>
      </div>
    </>
  );
}

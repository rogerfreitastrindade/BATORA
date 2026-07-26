import { listarCaixaMes, diaCaixa, sugestaoDia } from "@/lib/queries";
import { salvarDiaCaixa, lancarDiaAutomatico, excluirDiaCaixa } from "@/lib/actions";
import { fmtBRL, fmtData, fmtMesAno, parseMesParam, hojeISO, mesISO } from "@/lib/format";
import { Titulo, SeletorMes, Tabela, Cartao } from "@/components/ui";
import Link from "next/link";
import { Zap, Trash2, Pencil, Save } from "lucide-react";

import { exigirAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function campoValor(id: string, nome: string, rotulo: string, valor: number) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-suave uppercase">{rotulo}</label>
      <input id={id} name={nome} inputMode="decimal" defaultValue={valor.toFixed(2).replace(".", ",")}
        className="h-11 rounded-lg bg-fundo border border-borda px-3 num w-full" />
    </div>
  );
}

export default async function Caixa({ searchParams }: { searchParams: Promise<{ mes?: string; editar?: string }> }) {
  await exigirAdmin();
  const sp = await searchParams;
  const { ano, mes } = parseMesParam(sp.mes);
  const mesStr = mesISO(ano, mes);
  const dias = listarCaixaMes(mesStr);
  const hoje = hojeISO();
  const hojeLancado = !!diaCaixa(hoje);

  const dataEdicao = sp.editar && /^\d{4}-\d{2}-\d{2}$/.test(sp.editar) ? sp.editar : null;
  const diaEdit = dataEdicao ? diaCaixa(dataEdicao) : null;
  const sug = dataEdicao && !diaEdit ? sugestaoDia(dataEdicao) : null;
  const valores = diaEdit ?? (sug ? { ...sug, obs: null } : null);

  const totalEntradas = dias.reduce((s, d) => s + d.entradas, 0);
  const totalPix = dias.reduce((s, d) => s + d.pix, 0);
  const totalRetiradas = dias.reduce((s, d) => s + d.retiradas, 0);

  return (
    <>
      <Titulo acao={<SeletorMes base="/caixa" ano={ano} mes={mes} />}>
        Caixa diário — {fmtMesAno(ano, mes)}
      </Titulo>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-5">
        {!hojeLancado && (
          <form action={lancarDiaAutomatico} className="w-full sm:w-auto">
            <input type="hidden" name="data" value={hoje} />
            <button type="submit"
              className="w-full sm:w-auto h-12 px-5 rounded-xl bg-cta text-cta-texto font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-amber-400">
              <Zap className="w-5 h-5" aria-hidden />
              Lançar hoje ({fmtData(hoje)}) automático
            </button>
          </form>
        )}
        <Link href={`/caixa?mes=${mesStr}&editar=${hoje}`}
          className="w-full sm:w-auto h-12 px-5 rounded-xl border border-borda font-semibold flex items-center justify-center gap-2 text-suave hover:text-texto cursor-pointer transition-colors duration-200">
          <Pencil className="w-4 h-4" aria-hidden /> Lançar / editar um dia
        </Link>
      </div>

      {dataEdicao && (
        <Cartao className="p-4 mb-6 border-primaria">
          <h2 className="font-bold mb-1">
            {diaEdit ? `Editar dia ${fmtData(dataEdicao)}` : `Lançar dia ${fmtData(dataEdicao)}`}
          </h2>
          <p className="text-suave text-sm mb-3">
            Início do dia puxado do final do dia anterior; entradas e PIX sugeridos pelas pesagens à vista do dia;
            retiradas sugeridas pelos gastos. Ajuste o que precisar e salve.
          </p>
          <form action={salvarDiaCaixa} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label htmlFor="cx-data" className="text-xs font-semibold text-suave uppercase">Data</label>
              <input id="cx-data" name="data" type="date" required defaultValue={dataEdicao}
                className="h-11 rounded-lg bg-fundo border border-borda px-3 num" />
            </div>
            {campoValor("cx-inicio", "inicio", "Início do dia", valores?.inicio ?? 0)}
            {campoValor("cx-entradas", "entradas", "Entradas dinheiro", valores?.entradas ?? 0)}
            {campoValor("cx-pix", "pix", "PIX / cartão", valores?.pix ?? 0)}
            {campoValor("cx-retiradas", "retiradas", "Retiradas", valores?.retiradas ?? 0)}
            <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
              <label htmlFor="cx-obs" className="text-xs font-semibold text-suave uppercase">Observação</label>
              <input id="cx-obs" name="obs" defaultValue={valores && "obs" in valores ? valores.obs ?? "" : ""}
                className="h-11 rounded-lg bg-fundo border border-borda px-3 w-full" />
            </div>
            <div className="flex gap-2">
              <button type="submit"
                className="h-11 px-4 rounded-lg bg-cta text-cta-texto font-bold flex items-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-amber-400">
                <Save className="w-4 h-4" aria-hidden /> Salvar
              </button>
              <Link href={`/caixa?mes=${mesStr}`}
                className="h-11 px-4 rounded-lg border border-borda text-suave font-semibold flex items-center cursor-pointer hover:text-texto transition-colors duration-200">
                Fechar
              </Link>
            </div>
          </form>
        </Cartao>
      )}

      {/* celular: um cartão por dia */}
      <div className="md:hidden flex flex-col gap-3">
        {dias.length === 0 && (
          <div className="bg-superficie border border-borda rounded-xl p-5 text-center text-suave">
            Nenhum dia lançado neste mês.
          </div>
        )}
        {dias.map((d) => (
          <div key={d.data} className="bg-superficie border border-borda rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="num font-bold text-lg">{fmtData(d.data)}</span>
              <div className="flex items-center gap-1">
                <Link href={`/caixa?mes=${mesStr}&editar=${d.data}`} aria-label={`Editar dia ${fmtData(d.data)}`}
                  className="w-11 h-11 flex items-center justify-center rounded-lg text-suave cursor-pointer">
                  <Pencil className="w-5 h-5" aria-hidden />
                </Link>
                <form action={excluirDiaCaixa}>
                  <input type="hidden" name="data" value={d.data} />
                  <button type="submit" aria-label={`Excluir dia ${fmtData(d.data)}`}
                    className="w-11 h-11 flex items-center justify-center rounded-lg text-suave hover:text-perigo cursor-pointer">
                    <Trash2 className="w-5 h-5" aria-hidden />
                  </button>
                </form>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-suave">Início</dt>
                <dd className="num">{fmtBRL(d.inicio)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-suave">Entradas</dt>
                <dd className="num text-green-300">{fmtBRL(d.entradas)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-suave">PIX/cartão</dt>
                <dd className="num text-cyan-300">{fmtBRL(d.pix)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-suave">Retiradas</dt>
                <dd className="num text-red-300">{fmtBRL(d.retiradas)}</dd>
              </div>
            </dl>
            <div className="mt-3 pt-3 border-t border-borda flex items-center justify-between">
              <div>
                <p className="text-xs text-suave uppercase font-semibold">Dinheiro físico</p>
                <p className="num font-bold">{fmtBRL(d.total_dinheiro)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-suave uppercase font-semibold">Total do dia</p>
                <p className="num font-bold text-amber-300 text-lg">{fmtBRL(d.total_dia)}</p>
              </div>
            </div>
            {d.obs && <p className="mt-2 text-sm text-suave">{d.obs}</p>}
          </div>
        ))}
        {dias.length > 0 && (
          <div className="bg-superficie-2 border border-borda rounded-xl p-4">
            <p className="font-bold mb-2">Totais do mês</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-suave">Entradas</dt>
                <dd className="num text-green-300">{fmtBRL(totalEntradas)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-suave">PIX/cartão</dt>
                <dd className="num text-cyan-300">{fmtBRL(totalPix)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-suave">Retiradas</dt>
                <dd className="num text-red-300">{fmtBRL(totalRetiradas)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-suave">Último dia</dt>
                <dd className="num text-amber-300 font-bold">{fmtBRL(dias[dias.length - 1]?.total_dia ?? 0)}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <div className="hidden md:block">
      <Tabela cab={["Data", "Início do dia", "Entradas dinheiro", "PIX / cartão", "Retiradas", "Total dinheiro físico", "Total do dia", ""]}>
        {dias.length === 0 && (
          <tr><td colSpan={8} className="px-4 py-8 text-center text-suave">Nenhum dia lançado neste mês.</td></tr>
        )}
        {dias.map((d) => (
          <tr key={d.data} className="hover:bg-superficie-2 transition-colors duration-150">
            <td className="px-4 py-2.5 num whitespace-nowrap font-semibold">{fmtData(d.data)}</td>
            <td className="px-4 py-2.5 num">{fmtBRL(d.inicio)}</td>
            <td className="px-4 py-2.5 num text-green-300">{fmtBRL(d.entradas)}</td>
            <td className="px-4 py-2.5 num text-cyan-300">{fmtBRL(d.pix)}</td>
            <td className="px-4 py-2.5 num text-red-300">{fmtBRL(d.retiradas)}</td>
            <td className="px-4 py-2.5 num font-bold">{fmtBRL(d.total_dinheiro)}</td>
            <td className="px-4 py-2.5 num font-bold text-amber-300">{fmtBRL(d.total_dia)}</td>
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-1 justify-end">
                <Link href={`/caixa?mes=${mesStr}&editar=${d.data}`} aria-label={`Editar dia ${fmtData(d.data)}`}
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-suave hover:text-texto hover:bg-superficie-2 cursor-pointer transition-colors duration-200">
                  <Pencil className="w-4 h-4" aria-hidden />
                </Link>
                <form action={excluirDiaCaixa}>
                  <input type="hidden" name="data" value={d.data} />
                  <button type="submit" aria-label={`Excluir dia ${fmtData(d.data)}`}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-suave hover:text-perigo hover:bg-perigo/10 cursor-pointer transition-colors duration-200">
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                </form>
              </div>
            </td>
          </tr>
        ))}
        {dias.length > 0 && (
          <tr className="bg-superficie-2 font-bold">
            <td className="px-4 py-3">Totais do mês</td>
            <td />
            <td className="px-4 py-3 num text-green-300">{fmtBRL(totalEntradas)}</td>
            <td className="px-4 py-3 num text-cyan-300">{fmtBRL(totalPix)}</td>
            <td className="px-4 py-3 num text-red-300">{fmtBRL(totalRetiradas)}</td>
            <td className="px-4 py-3 num">{fmtBRL(dias[dias.length - 1]?.total_dinheiro ?? 0)}</td>
            <td className="px-4 py-3 num text-amber-300">{fmtBRL(dias[dias.length - 1]?.total_dia ?? 0)}</td>
            <td />
          </tr>
        )}
      </Tabela>
      </div>
    </>
  );
}

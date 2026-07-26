import { listarGastos } from "@/lib/queries";
import { criarGasto, excluirGasto } from "@/lib/actions";
import { fmtBRL, fmtData, fmtMesAno, parseMesParam, hojeISO, agoraHora, mesISO } from "@/lib/format";
import { Titulo, SeletorMes, Tabela, Cartao } from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";

import { exigirAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Gastos({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await exigirAdmin();
  const sp = await searchParams;
  const { ano, mes } = parseMesParam(sp.mes);
  const gastos = listarGastos(mesISO(ano, mes));
  const total = gastos.reduce((s, g) => s + g.valor, 0);

  return (
    <>
      <Titulo acao={<SeletorMes base="/gastos" ano={ano} mes={mes} />}>
        Gastos — {fmtMesAno(ano, mes)}
      </Titulo>

      <Cartao className="p-4 mb-5">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Plus className="w-5 h-5 text-cta" aria-hidden /> Novo gasto
        </h2>
        <form action={criarGasto} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="g-data" className="text-xs font-semibold text-suave uppercase">Data</label>
            <input id="g-data" name="data" type="date" required defaultValue={hojeISO()}
              className="h-11 rounded-lg bg-fundo border border-borda px-3 num" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="g-hora" className="text-xs font-semibold text-suave uppercase">Hora</label>
            <input id="g-hora" name="hora" type="time" defaultValue={agoraHora()}
              className="h-11 rounded-lg bg-fundo border border-borda px-3 num" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="g-valor" className="text-xs font-semibold text-suave uppercase">Valor (R$)</label>
            <input id="g-valor" name="valor" required inputMode="decimal" placeholder="0,00"
              className="h-11 rounded-lg bg-fundo border border-borda px-3 num w-32" />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-48">
            <label htmlFor="g-desc" className="text-xs font-semibold text-suave uppercase">Descrição</label>
            <input id="g-desc" name="descricao" required placeholder="EX.: ALMOÇO, TONER, FOLHAS"
              className="h-11 rounded-lg bg-fundo border border-borda px-3 uppercase w-full" />
          </div>
          <button type="submit"
            className="h-11 px-5 rounded-lg bg-cta text-cta-texto font-bold cursor-pointer transition-colors duration-200 hover:bg-amber-400">
            Registrar
          </button>
        </form>
      </Cartao>

      <p className="text-suave text-sm mb-2">
        Total do mês: <strong className="num text-perigo">{fmtBRL(total)}</strong>
      </p>

      {/* celular: lista em cartões */}
      <div className="md:hidden flex flex-col gap-2">
        {gastos.length === 0 && (
          <div className="bg-superficie border border-borda rounded-xl p-5 text-center text-suave">
            Nenhum gasto neste mês.
          </div>
        )}
        {gastos.map((g) => (
          <div key={g.id} className="bg-superficie border border-borda rounded-xl p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{g.descricao}</p>
              <p className="text-suave text-sm num">{fmtData(g.data)}{g.hora ? ` às ${g.hora}` : ""}</p>
            </div>
            <span className="num font-bold text-red-300 shrink-0">{fmtBRL(g.valor)}</span>
            <form action={excluirGasto} className="shrink-0">
              <input type="hidden" name="id" value={g.id} />
              <button type="submit" aria-label={`Excluir gasto ${g.descricao}`}
                className="w-11 h-11 flex items-center justify-center rounded-lg text-suave hover:text-perigo cursor-pointer">
                <Trash2 className="w-5 h-5" aria-hidden />
              </button>
            </form>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
      <Tabela cab={["Data", "Hora", "Valor", "Descrição", ""]}>
        {gastos.length === 0 && (
          <tr><td colSpan={5} className="px-4 py-8 text-center text-suave">Nenhum gasto neste mês.</td></tr>
        )}
        {gastos.map((g) => (
          <tr key={g.id} className="hover:bg-superficie-2 transition-colors duration-150">
            <td className="px-4 py-2.5 num whitespace-nowrap">{fmtData(g.data)}</td>
            <td className="px-4 py-2.5 num">{g.hora ?? "—"}</td>
            <td className="px-4 py-2.5 num font-semibold text-red-300">{fmtBRL(g.valor)}</td>
            <td className="px-4 py-2.5">{g.descricao}</td>
            <td className="px-4 py-2.5 text-right">
              <form action={excluirGasto} className="inline-block">
                <input type="hidden" name="id" value={g.id} />
                <button type="submit" aria-label={`Excluir gasto ${g.descricao}`}
                  className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-suave hover:text-perigo hover:bg-perigo/10 cursor-pointer transition-colors duration-200">
                  <Trash2 className="w-4 h-4" aria-hidden />
                </button>
              </form>
            </td>
          </tr>
        ))}
      </Tabela>
      </div>
    </>
  );
}

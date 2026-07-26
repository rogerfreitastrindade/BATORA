import { balancoMensal, evolucaoMensal, painelConveniadas, listarPesagens } from "@/lib/queries";
import { fmtBRL, fmtNum, fmtData, fmtMesAno, parseMesParam, MESES } from "@/lib/format";
import { Titulo, Indicador, SeletorMes, Cartao, EtiquetaForma, EtiquetaStatus, Tabela } from "@/components/ui";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { exigirAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Painel({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await exigirAdmin();
  const sp = await searchParams;
  const { ano, mes } = parseMesParam(sp.mes);
  const b = balancoMensal(ano, mes);
  const evolucao = evolucaoMensal(12);
  const conveniadas = painelConveniadas(ano, mes);
  const ultimas = listarPesagens({ limite: 8 });
  const maxReceita = Math.max(1, ...evolucao.map((e) => e.receita));

  return (
    <>
      <Titulo acao={<SeletorMes base="/" ano={ano} mes={mes} />}>Balanço — {fmtMesAno(ano, mes)}</Titulo>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Indicador rotulo="Pesagens no mês" valor={fmtNum(b.qtdTotal)}
          detalhe={`${fmtNum(b.qtdMensal)} mensal · ${fmtNum(b.qtdDinheiro + b.qtdPix)} à vista`} />
        <Indicador rotulo="À vista — Dinheiro" valor={fmtBRL(b.receitaDinheiro)} detalhe={`${fmtNum(b.qtdDinheiro)} pesagens`} />
        <Indicador rotulo="À vista — PIX" valor={fmtBRL(b.receitaPix)} detalhe={`${fmtNum(b.qtdPix)} pesagens`} />
        <Indicador rotulo="Conveniadas a cobrar" valor={fmtBRL(b.totalConveniadas)}
          detalhe={`${fmtBRL(b.emAbertoConveniadas)} em aberto`} />
        <Indicador rotulo="Gastos do mês" valor={fmtBRL(b.gastos)} />
        <Indicador rotulo="Resultado do mês" valor={fmtBRL(b.resultado)} destaque
          detalhe="à vista + conveniadas − gastos" />
      </div>

      <section className="mt-8" aria-label="Evolução mensal">
        <h2 className="text-lg font-bold mb-3">Evolução da receita (12 meses)</h2>
        <Cartao className="p-4 lg:p-6">
          {evolucao.length === 0 ? (
            <p className="text-suave">Sem dados ainda.</p>
          ) : (
            <div className="flex items-end gap-1.5 lg:gap-3 h-44" role="img"
              aria-label={`Receita mensal: ${evolucao.map((e) => `${MESES[e.mes - 1]} ${fmtBRL(e.receita)}`).join(", ")}`}>
              {evolucao.map((e) => {
                const atual = e.ano === ano && e.mes === mes;
                return (
                  <Link key={`${e.ano}-${e.mes}`} href={`/?mes=${e.ano}-${String(e.mes).padStart(2, "0")}`}
                    className="flex-1 flex flex-col items-center gap-1 h-full justify-end cursor-pointer group"
                    title={`${fmtMesAno(e.ano, e.mes)}: ${fmtBRL(e.receita)} · ${fmtNum(e.pesagens)} pesagens`}>
                    <span className="num text-[10px] lg:text-xs text-suave group-hover:text-texto hidden sm:block">
                      {Math.round(e.receita / 1000)}k
                    </span>
                    <div style={{ height: `${Math.max(4, (e.receita / maxReceita) * 100)}%` }}
                      className={`w-full rounded-t-md transition-colors duration-200 ${atual ? "bg-cta" : "bg-primaria group-hover:bg-primaria-forte"}`} />
                    <span className={`text-[10px] lg:text-xs ${atual ? "text-amber-300 font-bold" : "text-suave"}`}>
                      {MESES[e.mes - 1].slice(0, 3)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </Cartao>
      </section>

      <div className="mt-8 grid lg:grid-cols-2 gap-6">
        <section aria-label="Conveniadas do mês" className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Conveniadas do mês</h2>
            <Link href={`/conveniadas?mes=${ano}-${String(mes).padStart(2, "0")}`}
              className="text-primaria text-sm font-semibold flex items-center gap-1 cursor-pointer hover:underline">
              Ver painel <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
          {conveniadas.length === 0 ? (
            <Cartao className="p-5 text-suave">Nenhuma pesagem de conveniada neste mês.</Cartao>
          ) : (
            <Tabela cab={["Empresa", "Qtd", "Total", "Status"]}>
              {conveniadas.map((c) => (
                <tr key={c.empresa_id}>
                  <td className="px-4 py-2.5 font-medium">{c.nome}</td>
                  <td className="px-4 py-2.5 num">{c.qtd}</td>
                  <td className="px-4 py-2.5 num">{fmtBRL(c.total)}</td>
                  <td className="px-4 py-2.5"><EtiquetaStatus status={c.status} /></td>
                </tr>
              ))}
            </Tabela>
          )}
        </section>

        <section aria-label="Últimas pesagens" className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Últimas pesagens</h2>
            <Link href="/pesagens" className="text-primaria text-sm font-semibold flex items-center gap-1 cursor-pointer hover:underline">
              Ver todas <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
          <Tabela cab={["Nº", "Data", "Placa", "Forma", "Empresa"]}>
            {ultimas.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2.5 num">{String(p.seq).padStart(2, "0")}</td>
                <td className="px-4 py-2.5 num whitespace-nowrap">{fmtData(p.data)}</td>
                <td className="px-4 py-2.5 num font-semibold">{p.placa}</td>
                <td className="px-4 py-2.5"><EtiquetaForma forma={p.forma} /></td>
                <td className="px-4 py-2.5">{p.empresa_nome ?? (p.forma === "MENSAL" ? "—" : "PARTICULAR")}</td>
              </tr>
            ))}
          </Tabela>
        </section>
      </div>
    </>
  );
}

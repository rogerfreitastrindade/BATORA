import { listarPesagens, listarEmpresasSemSenha, nomesClientes } from "@/lib/queries";
import { criarPesagem, excluirPesagem } from "@/lib/actions";
import { fmtData, fmtMesAno, parseMesParam, hojeISO, agoraHora, mesISO, fmtNum } from "@/lib/format";
import { Titulo, SeletorMes, Tabela, EtiquetaForma, Cartao } from "@/components/ui";
import { FormaEmpresaCampos } from "@/components/forma-empresa";
import { ClienteCampo } from "@/components/cliente-campo";
import Link from "next/link";
import { sessaoAtual } from "@/lib/auth";
import { Plus, Search, Trash2, Pencil, Ticket } from "lucide-react";

export const dynamic = "force-dynamic";

type SP = { mes?: string; empresa?: string; forma?: string; placa?: string; nova?: string };

export default async function Pesagens({ searchParams }: { searchParams: Promise<SP> }) {
  const sessao = await sessaoAtual();
  const soLeitura = sessao?.papel === "emp";
  const sp = await searchParams;
  const { ano, mes } = parseMesParam(sp.mes);
  const empresas = listarEmpresasSemSenha();
  // empresa logada só enxerga as pesagens dela mesma
  const filtroEmpresa = soLeitura
    ? sessao!.empresaId ?? undefined
    : sp.empresa === "PARTICULAR" ? "PARTICULAR" as const : sp.empresa ? Number(sp.empresa) : undefined;
  const pesagens = listarPesagens({
    ano, mes,
    empresa_id: filtroEmpresa,
    forma: sp.forma || undefined,
    placa: sp.placa || undefined,
  });
  const params: Record<string, string> = {};
  if (sp.empresa) params.empresa = sp.empresa;
  if (sp.forma) params.forma = sp.forma;
  if (sp.placa) params.placa = sp.placa;

  return (
    <>
      <Titulo acao={<SeletorMes base="/pesagens" ano={ano} mes={mes} params={params} />}>
        Pesagens — {fmtMesAno(ano, mes)}
      </Titulo>

      {!soLeitura && (
      <Cartao className="p-4 mb-4">
        <h2 className="font-bold mb-1 flex items-center gap-2">
          <Plus className="w-5 h-5 text-cta" aria-hidden /> Nova pesagem
        </h2>
        <p className="text-suave text-sm mb-3">
          O número sai sozinho e reinicia em 01 todo mês. Data e hora já vêm preenchidas com o momento atual.
        </p>
        <form action={criarPesagem} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="np-data" className="text-xs font-semibold text-suave uppercase">Data</label>
            <input id="np-data" name="data" type="date" required defaultValue={hojeISO()}
              className="h-11 rounded-lg bg-fundo border border-borda px-3 num" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="np-hora" className="text-xs font-semibold text-suave uppercase">Hora de saída</label>
            <input id="np-hora" name="hora" type="time" defaultValue={agoraHora()}
              className="h-11 rounded-lg bg-fundo border border-borda px-3 num" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="np-placa" className="text-xs font-semibold text-suave uppercase">Placa</label>
            <input id="np-placa" name="placa" required placeholder="ABC1D23" autoCapitalize="characters"
              className="h-11 rounded-lg bg-fundo border border-borda px-3 uppercase num" />
          </div>
          <FormaEmpresaCampos empresas={empresas} prefixo="np" />
          <div className="col-span-2 md:col-span-1">
            <ClienteCampo nomes={nomesClientes()} id="np-cliente" rotulo="Cliente (opcional)" />
          </div>
          <button type="submit"
            className="h-11 rounded-lg bg-cta text-cta-texto font-bold px-4 cursor-pointer transition-colors duration-200 hover:bg-amber-400 col-span-2 md:col-span-1">
            Registrar
          </button>
        </form>
      </Cartao>
      )}

      <form method="GET" action="/pesagens" className="flex flex-wrap gap-2 mb-4 items-end">
        <input type="hidden" name="mes" value={mesISO(ano, mes)} />
        <div className="flex flex-col gap-1 flex-1 min-w-36">
          <label htmlFor="f-placa" className="text-xs font-semibold text-suave uppercase">Buscar placa</label>
          <input id="f-placa" name="placa" defaultValue={sp.placa || ""} placeholder="Digite a placa"
            className="h-11 rounded-lg bg-superficie border border-borda px-3 uppercase num w-full" />
        </div>
        {!soLeitura && (<>
        <div className="flex flex-col gap-1">
          <label htmlFor="f-forma" className="text-xs font-semibold text-suave uppercase">Forma</label>
          <select id="f-forma" name="forma" defaultValue={sp.forma || ""}
            className="h-11 rounded-lg bg-superficie border border-borda px-3 cursor-pointer">
            <option value="">Todas</option>
            <option value="PIX">PIX</option>
            <option value="DINHEIRO">DINHEIRO</option>
            <option value="MENSAL">MENSAL</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="f-empresa" className="text-xs font-semibold text-suave uppercase">Empresa</label>
          <select id="f-empresa" name="empresa" defaultValue={sp.empresa || ""}
            className="h-11 rounded-lg bg-superficie border border-borda px-3 cursor-pointer max-w-48">
            <option value="">Todas</option>
            <option value="PARTICULAR">PARTICULAR</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
        </div>
        </>)}
        <button type="submit"
          className="h-11 px-4 rounded-lg bg-primaria-forte text-white font-semibold flex items-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-primaria">
          <Search className="w-4 h-4" aria-hidden /> Filtrar
        </button>
        {(sp.placa || sp.forma || sp.empresa) && (
          <Link href={`/pesagens?mes=${mesISO(ano, mes)}`}
            className="h-11 px-4 rounded-lg border border-borda text-suave font-semibold flex items-center cursor-pointer hover:text-texto transition-colors duration-200">
            Limpar
          </Link>
        )}
      </form>

      <p className="text-suave text-sm mb-2">{fmtNum(pesagens.length)} pesagens encontradas</p>

      {/* celular: lista em cartões */}
      <div className="md:hidden flex flex-col gap-2">
        {pesagens.length === 0 && (
          <div className="bg-superficie border border-borda rounded-xl p-5 text-center text-suave">
            Nenhuma pesagem neste filtro.
          </div>
        )}
        {pesagens.map((p) => (
          <div key={p.id} className="bg-superficie border border-borda rounded-xl p-3 flex items-center gap-3">
            <span className="num font-bold text-lg w-9 shrink-0 text-center text-suave">
              {String(p.seq).padStart(2, "0")}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="num font-bold text-base">{p.placa}</span>
                <EtiquetaForma forma={p.forma} />
              </div>
              <p className="text-suave text-sm num mt-0.5 truncate">
                {fmtData(p.data)}{p.hora ? ` às ${p.hora}` : ""} · {p.empresa_nome ?? (p.forma === "MENSAL" ? "—" : "PARTICULAR")}
                {!soLeitura && p.cliente_nome ? ` · ${p.cliente_nome}` : ""}
              </p>
            </div>
            <div className="flex items-center shrink-0">
              {p.ticket_id && (
                <Link href={`/tickets/${p.ticket_id}`} aria-label={`Abrir ticket da pesagem ${p.seq}`}
                  className="w-11 h-11 flex items-center justify-center rounded-lg text-primaria cursor-pointer">
                  <Ticket className="w-5 h-5" aria-hidden />
                </Link>
              )}
              {!soLeitura && (<>
              <Link href={`/pesagens/${p.id}/editar`} aria-label={`Editar pesagem ${p.seq}`}
                className="w-11 h-11 flex items-center justify-center rounded-lg text-suave cursor-pointer">
                <Pencil className="w-5 h-5" aria-hidden />
              </Link>
              <form action={excluirPesagem}>
                <input type="hidden" name="id" value={p.id} />
                <button type="submit" aria-label={`Excluir pesagem ${p.seq}`}
                  className="w-11 h-11 flex items-center justify-center rounded-lg text-suave hover:text-perigo cursor-pointer">
                  <Trash2 className="w-5 h-5" aria-hidden />
                </button>
              </form>
              </>)}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
      <Tabela cab={soLeitura
        ? ["Nº", "Data", "Hora saída", "Placa", "Forma de pagamento", "Empresa", "Origem"]
        : ["Nº", "Data", "Hora saída", "Placa", "Forma de pagamento", "Empresa", "Cliente", "Origem", ""]}>
        {pesagens.length === 0 && (
          <tr><td colSpan={soLeitura ? 7 : 9} className="px-4 py-8 text-center text-suave">Nenhuma pesagem neste filtro.</td></tr>
        )}
        {pesagens.map((p) => (
          <tr key={p.id} className="hover:bg-superficie-2 transition-colors duration-150">
            <td className="px-4 py-2.5 num font-bold">{String(p.seq).padStart(2, "0")}</td>
            <td className="px-4 py-2.5 num whitespace-nowrap">{fmtData(p.data)}</td>
            <td className="px-4 py-2.5 num">{p.hora ?? "—"}</td>
            <td className="px-4 py-2.5 num font-semibold">{p.placa}</td>
            <td className="px-4 py-2.5"><EtiquetaForma forma={p.forma} /></td>
            <td className="px-4 py-2.5">{p.empresa_nome ?? (p.forma === "MENSAL" ? "—" : "PARTICULAR")}</td>
            {!soLeitura && <td className="px-4 py-2.5">{p.cliente_nome ?? "—"}</td>}
            <td className="px-4 py-2.5">
              {p.ticket_id ? (
                <Link href={`/tickets/${p.ticket_id}`} className="text-primaria flex items-center gap-1 cursor-pointer hover:underline">
                  <Ticket className="w-4 h-4" aria-hidden /> Ticket
                </Link>
              ) : (
                <span className="text-suave">Manual</span>
              )}
            </td>
            {!soLeitura && (
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-1 justify-end">
                <Link href={`/pesagens/${p.id}/editar`} aria-label={`Editar pesagem ${p.seq}`}
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-suave hover:text-texto hover:bg-superficie-2 cursor-pointer transition-colors duration-200">
                  <Pencil className="w-4 h-4" aria-hidden />
                </Link>
                <form action={excluirPesagem}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" aria-label={`Excluir pesagem ${p.seq}`}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-suave hover:text-perigo hover:bg-perigo/10 cursor-pointer transition-colors duration-200">
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                </form>
              </div>
            </td>
            )}
          </tr>
        ))}
      </Tabela>
      </div>
    </>
  );
}

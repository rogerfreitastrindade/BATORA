import { listarTickets } from "@/lib/queries";
import { excluirTicket } from "@/lib/actions";
import { getDb } from "@/lib/db";
import { fmtBRL, fmtData, fmtNum } from "@/lib/format";
import { Titulo, Tabela, EtiquetaForma } from "@/components/ui";
import Link from "next/link";
import { sessaoAtual } from "@/lib/auth";
import { Plus, Printer, Trash2, Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

type CobrancaPendente = {
  id: number; tipo: string; valor: number; criado_em: string; ticket_dados: string;
};

export default async function Tickets() {
  const sessao = await sessaoAtual();
  const soLeitura = sessao?.papel === "emp";
  const tickets = listarTickets(200, soLeitura ? sessao!.empresaId ?? undefined : undefined);
  const pendentes = soLeitura ? [] : getDb().prepare(
    "SELECT id, tipo, valor, criado_em, ticket_dados FROM pagamentos WHERE status = 'PENDENTE' ORDER BY id DESC LIMIT 10"
  ).all() as CobrancaPendente[];
  const aguardandoPeso = soLeitura
    ? getDb().prepare(
        "SELECT id, cliente, placa, criado_em FROM solicitacoes WHERE empresa_id = ? AND status = 'AGUARDANDO' ORDER BY id DESC"
      ).all(sessao!.empresaId) as { id: number; cliente: string; placa: string; criado_em: string }[]
    : [];
  return (
    <>
      <Titulo
        acao={
          <Link href="/ticket"
            className="h-11 px-4 rounded-xl bg-cta text-cta-texto font-bold flex items-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-amber-400">
            <Plus className="w-5 h-5" aria-hidden /> Novo ticket
          </Link>
        }
      >
        Tickets emitidos
      </Titulo>

      {aguardandoPeso.length > 0 && (
        <section aria-label="Solicitações aguardando peso bruto" className="mb-5">
          <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider mb-2">
            Aguardando a balança lançar o peso bruto
          </h2>
          <div className="flex flex-col gap-2">
            {aguardandoPeso.map((s) => (
              <Link key={s.id} href={`/solicitacoes/${s.id}`}
                className="bg-cta/10 border border-cta/40 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-cta/20">
                <Loader2 className="w-5 h-5 text-amber-300 shrink-0" aria-hidden />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{s.cliente} · <span className="num">{s.placa}</span></p>
                  <p className="text-suave text-xs num">
                    enviada em {fmtData(s.criado_em.slice(0, 10))} às {s.criado_em.slice(11, 16)} — toque para acompanhar
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {pendentes.length > 0 && (
        <section aria-label="Cobranças aguardando pagamento" className="mb-5">
          <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider mb-2">
            Cobranças aguardando pagamento
          </h2>
          <div className="flex flex-col gap-2">
            {pendentes.map((p) => {
              const dados = JSON.parse(p.ticket_dados) as { cliente: string; placa: string };
              return (
                <Link key={p.id} href={`/pagamentos/${p.id}`}
                  className="bg-cta/10 border border-cta/40 rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-cta/20">
                  <Loader2 className="w-5 h-5 text-amber-300 shrink-0" aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {dados.cliente} · <span className="num">{dados.placa}</span> · {p.tipo === "PIX" ? "PIX" : "CARTÃO"} {fmtBRL(p.valor)}
                    </p>
                    <p className="text-suave text-xs num">
                      criada em {fmtData(p.criado_em.slice(0, 10))} às {p.criado_em.slice(11, 16)} — toque para abrir o QR / link
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* celular: um cartão por ticket */}
      <div className="md:hidden flex flex-col gap-3">
        {tickets.length === 0 && (
          <div className="bg-superficie border border-borda rounded-xl p-5 text-center text-suave">
            Nenhum ticket emitido ainda.
          </div>
        )}
        {tickets.map((t) => (
          <div key={t.id} className="bg-superficie border border-borda rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="num font-bold">Nº {String(t.id).padStart(4, "0")}</span>
              <EtiquetaForma forma={t.forma} />
            </div>
            {!soLeitura && t.cliente_id ? (
              <Link href={`/clientes/${t.cliente_id}`}
                className="font-semibold truncate block cursor-pointer hover:text-primaria transition-colors duration-150">
                {t.cliente}
              </Link>
            ) : (
              <p className="font-semibold truncate">{t.cliente}</p>
            )}
            <p className="text-suave text-sm num mt-0.5">
              {fmtData(t.data_saida)}{t.hora_saida ? ` · ${t.hora_saida}` : ""} · {t.placa}
              {t.material ? ` · ${t.material}` : ""}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-suave uppercase font-semibold">Líquido</p>
                <p className="num font-bold text-lg">{fmtNum(t.liquido)} kg</p>
              </div>
              <div className="flex items-center gap-1">
                <Link href={`/tickets/${t.id}`} aria-label={`Abrir ticket ${t.id}`}
                  className="h-11 px-4 rounded-lg bg-primaria-forte text-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-colors duration-200 hover:bg-primaria">
                  <Printer className="w-4 h-4" aria-hidden /> Abrir
                </Link>
                {!soLeitura && (
                <form action={excluirTicket}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" aria-label={`Excluir ticket ${t.id}`}
                    className="w-11 h-11 flex items-center justify-center rounded-lg text-suave hover:text-perigo cursor-pointer">
                    <Trash2 className="w-5 h-5" aria-hidden />
                  </button>
                </form>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
      <Tabela cab={["Nº", "Data saída", "Cliente", "Placa", "Material", "Líquido", "Forma", "Valor", ""]}>
        {tickets.length === 0 && (
          <tr><td colSpan={9} className="px-4 py-8 text-center text-suave">Nenhum ticket emitido ainda.</td></tr>
        )}
        {tickets.map((t) => (
          <tr key={t.id} className="hover:bg-superficie-2 transition-colors duration-150">
            <td className="px-4 py-2.5 num font-bold">{String(t.id).padStart(4, "0")}</td>
            <td className="px-4 py-2.5 num whitespace-nowrap">{fmtData(t.data_saida)} {t.hora_saida ?? ""}</td>
            <td className="px-4 py-2.5 font-medium">
              {!soLeitura && t.cliente_id ? (
                <Link href={`/clientes/${t.cliente_id}`}
                  className="cursor-pointer hover:text-primaria hover:underline transition-colors duration-150">
                  {t.cliente}
                </Link>
              ) : t.cliente}
            </td>
            <td className="px-4 py-2.5 num font-semibold">{t.placa}</td>
            <td className="px-4 py-2.5">{t.material ?? "—"}</td>
            <td className="px-4 py-2.5 num">{fmtNum(t.liquido)} kg</td>
            <td className="px-4 py-2.5"><EtiquetaForma forma={t.forma} /></td>
            <td className="px-4 py-2.5 num">{fmtBRL(t.valor)}</td>
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-1 justify-end">
                <Link href={`/tickets/${t.id}`} aria-label={`Abrir ticket ${t.id}`}
                  className="h-10 px-3 rounded-lg bg-primaria-forte text-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-colors duration-200 hover:bg-primaria">
                  <Printer className="w-4 h-4" aria-hidden /> Abrir
                </Link>
                {!soLeitura && (
                <form action={excluirTicket}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" aria-label={`Excluir ticket ${t.id}`}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-suave hover:text-perigo hover:bg-perigo/10 cursor-pointer transition-colors duration-200">
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                </form>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Tabela>
      </div>
    </>
  );
}

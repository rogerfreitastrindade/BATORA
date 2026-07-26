import { obterCliente, historicoCliente } from "@/lib/queries";
import { atualizarCliente, excluirCliente } from "@/lib/actions";
import { fmtBRL, fmtData, fmtNum } from "@/lib/format";
import { Titulo, Cartao, Indicador, EtiquetaForma } from "@/components/ui";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, Printer, Ticket as TicketIcon } from "lucide-react";

import { exigirAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ClienteDetalhe({ params }: { params: Promise<{ id: string }> }) {
  await exigirAdmin();
  const { id } = await params;
  const cliente = obterCliente(Number(id));
  if (!cliente) notFound();
  const h = historicoCliente(cliente.id);

  return (
    <>
      <Link href="/clientes"
        className="text-suave flex items-center gap-1.5 text-sm font-semibold cursor-pointer hover:text-texto transition-colors duration-200 w-fit mb-3">
        <ArrowLeft className="w-4 h-4" aria-hidden /> Voltar aos clientes
      </Link>
      <Titulo>{cliente.nome}</Titulo>
      <p className="text-suave text-sm num mb-4">
        Cliente desde {fmtData(cliente.criado_em.slice(0, 10))} {cliente.criado_em.slice(11, 16)}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Indicador rotulo="Tickets" valor={fmtNum(h.tickets.length)} />
        <Indicador rotulo="Pesagens" valor={fmtNum(h.pesagens.length)} />
        <Indicador rotulo="Total pesado" valor={`${fmtNum(h.totalKg)} kg`} />
        <Indicador rotulo="Total em pesagens" valor={fmtBRL(h.totalValor)} destaque />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Cartao className="p-4">
          <h2 className="font-bold mb-3">Dados do cliente</h2>
          <form action={atualizarCliente} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={cliente.id} />
            <div className="flex flex-col gap-1">
              <label htmlFor="cl-nome" className="text-xs font-semibold text-suave uppercase">Nome</label>
              <input id="cl-nome" name="nome" required defaultValue={cliente.nome}
                className="h-12 rounded-xl bg-fundo border border-borda px-3 uppercase w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="cl-contato" className="text-xs font-semibold text-suave uppercase">
                Nome da pessoa física (contato)
              </label>
              <input id="cl-contato" name="contato" defaultValue={cliente.contato ?? ""}
                placeholder="QUEM RESPONDE PELA EMPRESA"
                className="h-12 rounded-xl bg-fundo border border-borda px-3 uppercase w-full" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="cl-doc" className="text-xs font-semibold text-suave uppercase">CNPJ ou CPF</label>
                <input id="cl-doc" name="cpf_cnpj" inputMode="numeric" defaultValue={cliente.cpf_cnpj ?? ""}
                  placeholder="00.000.000/0000-00 ou 000.000.000-00"
                  className="h-12 rounded-xl bg-fundo border border-borda px-3 num w-full" />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="cl-tel" className="text-xs font-semibold text-suave uppercase">Telefone / WhatsApp</label>
                <input id="cl-tel" name="telefone" inputMode="tel" defaultValue={cliente.telefone ?? ""}
                  placeholder="(31) 9 9999-9999" className="h-12 rounded-xl bg-fundo border border-borda px-3 num w-full" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="cl-email" className="text-xs font-semibold text-suave uppercase">E-mail</label>
              <input id="cl-email" name="email" type="email" defaultValue={cliente.email ?? ""}
                placeholder="contato@empresa.com.br"
                className="h-12 rounded-xl bg-fundo border border-borda px-3 num w-full" />
            </div>
            <fieldset className="flex flex-col gap-3">
              <legend className="text-xs font-semibold text-suave uppercase mb-1">Endereço</legend>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 col-span-2">
                  <label htmlFor="cl-rua" className="text-xs font-semibold text-suave uppercase">Rua</label>
                  <input id="cl-rua" name="rua" defaultValue={cliente.rua ?? ""}
                    placeholder="Rua / avenida / rodovia"
                    className="h-12 rounded-xl bg-fundo border border-borda px-3 w-full" />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="cl-numero" className="text-xs font-semibold text-suave uppercase">Número</label>
                  <input id="cl-numero" name="numero" defaultValue={cliente.numero ?? ""}
                    placeholder="Nº" inputMode="numeric"
                    className="h-12 rounded-xl bg-fundo border border-borda px-3 num w-full" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="cl-bairro" className="text-xs font-semibold text-suave uppercase">Bairro</label>
                  <input id="cl-bairro" name="bairro" defaultValue={cliente.bairro ?? ""}
                    placeholder="Bairro"
                    className="h-12 rounded-xl bg-fundo border border-borda px-3 w-full" />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="cl-cidade" className="text-xs font-semibold text-suave uppercase">Cidade</label>
                  <input id="cl-cidade" name="cidade" defaultValue={cliente.cidade ?? ""}
                    placeholder="Cidade"
                    className="h-12 rounded-xl bg-fundo border border-borda px-3 w-full" />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="cl-estado" className="text-xs font-semibold text-suave uppercase">Estado (UF)</label>
                  <input id="cl-estado" name="estado" defaultValue={cliente.estado ?? ""}
                    placeholder="MG" maxLength={2} autoCapitalize="characters"
                    className="h-12 rounded-xl bg-fundo border border-borda px-3 uppercase num w-full" />
                </div>
              </div>
            </fieldset>
            <div className="flex flex-col gap-1">
              <label htmlFor="cl-obs" className="text-xs font-semibold text-suave uppercase">Observações</label>
              <input id="cl-obs" name="obs" defaultValue={cliente.obs ?? ""}
                placeholder="Ex.: só paga no PIX, caminhão truck…"
                className="h-12 rounded-xl bg-fundo border border-borda px-3 w-full" />
            </div>
            <div className="flex gap-2">
              <button type="submit"
                className="h-12 px-5 rounded-xl bg-cta text-cta-texto font-bold flex items-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-amber-400">
                <Save className="w-5 h-5" aria-hidden /> Salvar
              </button>
            </div>
          </form>
          <form action={excluirCliente} className="mt-3 pt-3 border-t border-borda">
            <input type="hidden" name="id" value={cliente.id} />
            <button type="submit"
              className="h-11 px-4 rounded-lg border border-perigo/40 text-red-300 text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-perigo/10">
              <Trash2 className="w-4 h-4" aria-hidden /> Excluir cadastro (o histórico é mantido)
            </button>
          </form>
        </Cartao>

        <Cartao className="p-4">
          <h2 className="font-bold mb-3">Placas usadas</h2>
          {h.placas.length === 0 ? (
            <p className="text-suave text-sm">Nenhuma placa registrada ainda.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {h.placas.map((p) => (
                <Link key={p} href={`/pesagens?placa=${p}`}
                  className="num font-bold px-3 h-11 rounded-lg bg-superficie-2 border border-borda flex items-center cursor-pointer transition-colors duration-200 hover:border-primaria">
                  {p}
                </Link>
              ))}
            </div>
          )}
          <p className="text-suave text-[11px] mt-3">Toque numa placa para ver todas as pesagens dela.</p>
        </Cartao>
      </div>

      <section aria-label="Tickets do cliente" className="mb-6">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <TicketIcon className="w-5 h-5 text-cta" aria-hidden /> Tickets ({fmtNum(h.tickets.length)})
        </h2>
        <div className="flex flex-col gap-2">
          {h.tickets.length === 0 && (
            <Cartao className="p-5 text-center text-suave">Nenhum ticket emitido para este cliente.</Cartao>
          )}
          {h.tickets.map((t) => (
            <div key={t.id} className="bg-superficie border border-borda rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="num font-bold">Nº {String(t.id).padStart(4, "0")}</span>
                  <EtiquetaForma forma={t.forma} />
                </div>
                <p className="text-suave text-sm num mt-0.5 truncate">
                  {fmtData(t.data_saida)}{t.hora_saida ? ` às ${t.hora_saida}` : ""} · {t.placa}
                  {t.material ? ` · ${t.material}` : ""} · {fmtNum(t.liquido)} kg · {fmtBRL(t.valor)}
                </p>
              </div>
              <Link href={`/tickets/${t.id}`} aria-label={`Abrir ticket ${t.id}`}
                className="h-11 px-4 rounded-lg bg-primaria-forte text-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-colors duration-200 hover:bg-primaria shrink-0">
                <Printer className="w-4 h-4" aria-hidden /> Abrir
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Pesagens do cliente">
        <h2 className="text-lg font-bold mb-3">Pesagens ({fmtNum(h.pesagens.length)})</h2>
        <div className="flex flex-col gap-2">
          {h.pesagens.length === 0 && (
            <Cartao className="p-5 text-center text-suave">Nenhuma pesagem vinculada a este cliente.</Cartao>
          )}
          {h.pesagens.map((p) => (
            <div key={p.id} className="bg-superficie border border-borda rounded-xl p-3 flex items-center gap-3">
              <span className="num font-bold text-lg w-9 shrink-0 text-center text-suave">
                {String(p.seq).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="num font-bold">{p.placa}</span>
                  <EtiquetaForma forma={p.forma} />
                </div>
                <p className="text-suave text-sm num mt-0.5">
                  {fmtData(p.data)}{p.hora ? ` às ${p.hora}` : ""}
                  {p.empresa_nome ? ` · ${p.empresa_nome}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

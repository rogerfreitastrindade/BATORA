import { listarClientes } from "@/lib/queries";
import { criarClienteAction } from "@/lib/actions";
import { fmtData, fmtNum } from "@/lib/format";
import { Titulo, Cartao } from "@/components/ui";
import Link from "next/link";
import { Plus, Search, ChevronRight, Users, Phone } from "lucide-react";

import { exigirAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Clientes({ searchParams }: { searchParams: Promise<{ busca?: string }> }) {
  await exigirAdmin();
  const sp = await searchParams;
  const clientes = listarClientes(sp.busca || undefined);

  return (
    <>
      <Titulo>
        <span className="flex items-center gap-2">
          <Users className="w-7 h-7 text-primaria" aria-hidden /> Clientes
        </span>
      </Titulo>
      <p className="text-suave mb-4 max-w-2xl">
        Todo cliente que aparece num ticket entra aqui sozinho. Toque num cliente para ver o
        histórico completo dele (tickets, pesagens, placas e valores).
      </p>

      <Cartao className="p-4 mb-5">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Plus className="w-5 h-5 text-cta" aria-hidden /> Cadastrar cliente
        </h2>
        <form action={criarClienteAction} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="nc-nome" className="text-xs font-semibold text-suave uppercase">Nome</label>
            <input id="nc-nome" name="nome" required placeholder="NOME DO CLIENTE"
              className="h-12 rounded-xl bg-fundo border border-borda px-3 uppercase w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="nc-tel" className="text-xs font-semibold text-suave uppercase">Telefone / WhatsApp</label>
            <input id="nc-tel" name="telefone" inputMode="tel" placeholder="(31) 9 9999-9999"
              className="h-12 rounded-xl bg-fundo border border-borda px-3 num w-full" />
          </div>
          <button type="submit"
            className="h-12 px-5 rounded-xl bg-cta text-cta-texto font-bold cursor-pointer transition-colors duration-200 hover:bg-amber-400">
            Cadastrar
          </button>
        </form>
      </Cartao>

      <form method="GET" action="/clientes" className="flex gap-2 mb-4">
        <label htmlFor="busca-cliente" className="sr-only">Buscar cliente</label>
        <input id="busca-cliente" name="busca" defaultValue={sp.busca || ""} placeholder="Buscar cliente pelo nome"
          className="h-12 rounded-xl bg-superficie border border-borda px-3 uppercase flex-1 min-w-0" />
        <button type="submit"
          className="h-12 px-4 rounded-xl bg-primaria-forte text-white font-semibold flex items-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-primaria shrink-0">
          <Search className="w-4 h-4" aria-hidden /> Buscar
        </button>
      </form>

      <p className="text-suave text-sm mb-2">{fmtNum(clientes.length)} clientes</p>

      <div className="flex flex-col gap-2">
        {clientes.length === 0 && (
          <Cartao className="p-5 text-center text-suave">Nenhum cliente encontrado.</Cartao>
        )}
        {clientes.map((c) => (
          <Link key={c.id} href={`/clientes/${c.id}`}
            className="bg-superficie border border-borda rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-colors duration-200 hover:bg-superficie-2">
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{c.nome}</p>
              <p className="text-suave text-sm mt-0.5 flex items-center gap-3 flex-wrap">
                <span className="num">
                  {fmtNum(c.qtd_tickets ?? 0)} {(c.qtd_tickets ?? 0) === 1 ? "ticket" : "tickets"} · {fmtNum(c.qtd_pesagens ?? 0)} {(c.qtd_pesagens ?? 0) === 1 ? "pesagem" : "pesagens"}
                </span>
                {c.telefone && (
                  <span className="num flex items-center gap-1"><Phone className="w-3.5 h-3.5" aria-hidden />{c.telefone}</span>
                )}
              </p>
              {c.ultima_visita && (
                <p className="text-suave text-xs num mt-0.5">
                  Última visita: {fmtData(c.ultima_visita.slice(0, 10))} {c.ultima_visita.slice(11, 16)}
                </p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-suave shrink-0" aria-hidden />
          </Link>
        ))}
      </div>
    </>
  );
}

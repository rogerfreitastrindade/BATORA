import { getDb } from "@/lib/db";
import { listarEmpresasSemSenha, nomesClientes, type Pesagem } from "@/lib/queries";
import { atualizarPesagem } from "@/lib/actions";
import { Titulo, Cartao } from "@/components/ui";
import { FormaEmpresaCampos } from "@/components/forma-empresa";
import { ClienteCampo } from "@/components/cliente-campo";
import { notFound } from "next/navigation";
import Link from "next/link";

import { exigirAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EditarPesagem({ params }: { params: Promise<{ id: string }> }) {
  await exigirAdmin();
  const { id } = await params;
  const p = getDb().prepare(`
    SELECT p.*, c.nome AS cliente_nome FROM pesagens p
    LEFT JOIN clientes c ON c.id = p.cliente_id WHERE p.id = ?
  `).get(Number(id)) as Pesagem | undefined;
  if (!p) notFound();
  const empresas = listarEmpresasSemSenha();

  return (
    <>
      <Titulo>Editar pesagem nº {String(p.seq).padStart(2, "0")}</Titulo>
      <Cartao className="p-5 max-w-2xl">
        <form action={atualizarPesagem} className="grid grid-cols-2 gap-4 items-end">
          <input type="hidden" name="id" value={p.id} />
          <div className="flex flex-col gap-1">
            <label htmlFor="ed-data" className="text-xs font-semibold text-suave uppercase">Data</label>
            <input id="ed-data" name="data" type="date" required defaultValue={p.data}
              className="h-11 rounded-lg bg-fundo border border-borda px-3 num" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="ed-hora" className="text-xs font-semibold text-suave uppercase">Hora de saída</label>
            <input id="ed-hora" name="hora" type="time" defaultValue={p.hora ?? ""}
              className="h-11 rounded-lg bg-fundo border border-borda px-3 num" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="ed-placa" className="text-xs font-semibold text-suave uppercase">Placa</label>
            <input id="ed-placa" name="placa" required defaultValue={p.placa}
              className="h-11 rounded-lg bg-fundo border border-borda px-3 uppercase num" />
          </div>
          <FormaEmpresaCampos empresas={empresas} prefixo="ed" formaInicial={p.forma}
            empresaInicial={p.empresa_id ? String(p.empresa_id) : ""} />
          <div className="col-span-2">
            <ClienteCampo nomes={nomesClientes()} id="ed-cliente" rotulo="Cliente (opcional)"
              valorInicial={p.cliente_nome ?? ""} />
          </div>
          <div className="col-span-2 flex gap-3 mt-2">
            <button type="submit"
              className="h-12 px-6 rounded-xl bg-cta text-cta-texto font-bold cursor-pointer transition-colors duration-200 hover:bg-amber-400">
              Salvar alterações
            </button>
            <Link href="/pesagens"
              className="h-12 px-6 rounded-xl border border-borda text-suave font-semibold flex items-center cursor-pointer hover:text-texto transition-colors duration-200">
              Cancelar
            </Link>
          </div>
        </form>
      </Cartao>
    </>
  );
}

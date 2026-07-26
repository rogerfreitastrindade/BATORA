import { listarEmpresas } from "@/lib/queries";
import { criarEmpresa, atualizarEmpresa, alternarEmpresa } from "@/lib/actions";
import { Titulo, Cartao, Tabela } from "@/components/ui";
import { Plus, Save, Power } from "lucide-react";

import { exigirAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Empresas() {
  await exigirAdmin();
  const empresas = listarEmpresas();

  return (
    <>
      <Titulo>Empresas conveniadas</Titulo>
      <p className="text-suave mb-4 max-w-2xl">
        Cada empresa tem seu próprio <strong className="text-texto">valor por pesagem</strong> e uma{" "}
        <strong className="text-amber-300">senha única</strong> — sem ela não sai ticket no convênio.
        Passe a senha só para a empresa. Deixe o campo em branco e salve para gerar uma senha nova.
        Empresas inativas não aparecem nos formulários, mas o histórico é mantido.
      </p>

      <Cartao className="p-4 mb-6">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Plus className="w-5 h-5 text-cta" aria-hidden /> Nova empresa
        </h2>
        <form action={criarEmpresa} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-48">
            <label htmlFor="ne-nome" className="text-xs font-semibold text-suave uppercase">Nome</label>
            <input id="ne-nome" name="nome" required placeholder="NOME DA EMPRESA"
              className="h-11 rounded-lg bg-fundo border border-borda px-3 uppercase w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="ne-valor" className="text-xs font-semibold text-suave uppercase">Valor por pesagem (R$)</label>
            <input id="ne-valor" name="valor" inputMode="decimal" defaultValue="30,00"
              className="h-11 rounded-lg bg-fundo border border-borda px-3 num w-36" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="ne-senha" className="text-xs font-semibold text-suave uppercase">Senha (vazio = gera sozinho)</label>
            <input id="ne-senha" name="senha" autoComplete="off"
              className="h-11 rounded-lg bg-fundo border border-borda px-3 num w-36" />
          </div>
          <button type="submit"
            className="h-11 px-5 rounded-lg bg-cta text-cta-texto font-bold cursor-pointer transition-colors duration-200 hover:bg-amber-400">
            Cadastrar
          </button>
        </form>
      </Cartao>

      {/* celular: um cartão por empresa */}
      <div className="md:hidden flex flex-col gap-3">
        {empresas.map((e) => (
          <div key={e.id} className={`bg-superficie border border-borda rounded-xl p-4 ${e.ativa ? "" : "opacity-50"}`}>
            <form action={atualizarEmpresa} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={e.id} />
              <label htmlFor={`m-emp-nome-${e.id}`} className="sr-only">Nome da empresa</label>
              <input id={`m-emp-nome-${e.id}`} name="nome" defaultValue={e.nome}
                className="h-11 rounded-lg bg-fundo border border-borda px-3 uppercase w-full" />
              <div className="flex items-center gap-2">
                <label htmlFor={`m-emp-valor-${e.id}`} className="text-suave text-sm shrink-0">R$ por pesagem</label>
                <input id={`m-emp-valor-${e.id}`} name="valor"
                  defaultValue={e.valor_pesagem.toFixed(2).replace(".", ",")} inputMode="decimal"
                  className="h-11 rounded-lg bg-fundo border border-borda px-3 num w-24 flex-1" />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor={`m-emp-senha-${e.id}`} className="text-suave text-sm shrink-0">Senha do ticket</label>
                <input id={`m-emp-senha-${e.id}`} name="senha" defaultValue={e.senha ?? ""} autoComplete="off"
                  className="h-11 rounded-lg bg-fundo border border-cta/40 px-3 num tracking-widest w-24 flex-1 text-amber-300" />
                <button type="submit" aria-label={`Salvar ${e.nome}`}
                  className="h-11 w-11 shrink-0 rounded-lg bg-primaria-forte text-white flex items-center justify-center cursor-pointer transition-colors duration-200 hover:bg-primaria">
                  <Save className="w-4 h-4" aria-hidden />
                </button>
              </div>
            </form>
            <div className="mt-2 flex items-center justify-between">
              <span className={`text-xs font-bold ${e.ativa ? "text-green-300" : "text-suave"}`}>
                {e.ativa ? "ATIVA" : "INATIVA"}
              </span>
              <form action={alternarEmpresa}>
                <input type="hidden" name="id" value={e.id} />
                <button type="submit"
                  className="h-11 px-3 rounded-lg border border-borda text-suave flex items-center gap-2 text-sm font-semibold cursor-pointer hover:text-texto transition-colors duration-200">
                  <Power className="w-4 h-4" aria-hidden />
                  {e.ativa ? "Desativar" : "Ativar"}
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
      <Tabela cab={["Empresa", "Valor / Senha do ticket", "Situação", ""]}>
        {empresas.map((e) => (
          <tr key={e.id} className={e.ativa ? "" : "opacity-50"}>
            <td className="px-4 py-2 min-w-56" colSpan={2}>
              <form action={atualizarEmpresa} className="flex flex-wrap gap-2 items-center">
                <input type="hidden" name="id" value={e.id} />
                <label htmlFor={`emp-nome-${e.id}`} className="sr-only">Nome da empresa</label>
                <input id={`emp-nome-${e.id}`} name="nome" defaultValue={e.nome}
                  className="h-11 rounded-lg bg-fundo border border-borda px-3 uppercase flex-1 min-w-44" />
                <label htmlFor={`emp-valor-${e.id}`} className="sr-only">Valor por pesagem</label>
                <div className="flex items-center gap-1">
                  <span className="text-suave text-sm">R$</span>
                  <input id={`emp-valor-${e.id}`} name="valor"
                    defaultValue={e.valor_pesagem.toFixed(2).replace(".", ",")} inputMode="decimal"
                    className="h-11 rounded-lg bg-fundo border border-borda px-3 num w-24" />
                </div>
                <label htmlFor={`emp-senha-${e.id}`} className="sr-only">Senha do ticket</label>
                <div className="flex items-center gap-1" title="Senha única para emitir ticket no convênio">
                  <span className="text-suave text-sm">Senha</span>
                  <input id={`emp-senha-${e.id}`} name="senha" defaultValue={e.senha ?? ""} autoComplete="off"
                    className="h-11 rounded-lg bg-fundo border border-cta/40 px-3 num tracking-widest w-28 text-amber-300" />
                </div>
                <button type="submit" aria-label={`Salvar ${e.nome}`}
                  className="h-11 w-11 rounded-lg bg-primaria-forte text-white flex items-center justify-center cursor-pointer transition-colors duration-200 hover:bg-primaria">
                  <Save className="w-4 h-4" aria-hidden />
                </button>
              </form>
            </td>
            <td className="px-4 py-2">
              <span className={`text-xs font-bold ${e.ativa ? "text-green-300" : "text-suave"}`}>
                {e.ativa ? "ATIVA" : "INATIVA"}
              </span>
            </td>
            <td className="px-4 py-2">
              <form action={alternarEmpresa}>
                <input type="hidden" name="id" value={e.id} />
                <button type="submit"
                  className="h-11 px-3 rounded-lg border border-borda text-suave flex items-center gap-2 text-sm font-semibold cursor-pointer hover:text-texto transition-colors duration-200">
                  <Power className="w-4 h-4" aria-hidden />
                  {e.ativa ? "Desativar" : "Ativar"}
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

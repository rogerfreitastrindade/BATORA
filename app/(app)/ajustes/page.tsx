import { getConfig, precoAvulso } from "@/lib/db";
import { salvarAjustes } from "@/lib/actions";
import { Titulo, Cartao } from "@/components/ui";
import { TrocarSenhaForm } from "./trocar-senha";
import { Save } from "lucide-react";

import { exigirAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Ajustes() {
  await exigirAdmin();
  return (
    <>
      <Titulo>Ajustes</Titulo>
      <div className="grid gap-6 max-w-2xl">
        <Cartao className="p-5">
          <h2 className="font-bold mb-4">Valores e PIX</h2>
          <form action={salvarAjustes} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="aj-preco" className="text-xs font-semibold text-suave uppercase">
                Valor da pesagem avulsa — PARTICULAR (R$)
              </label>
              <input id="aj-preco" name="preco_avulso" inputMode="decimal"
                defaultValue={precoAvulso().toFixed(2).replace(".", ",")}
                className="h-12 rounded-xl bg-fundo border border-borda px-3 num w-40" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="aj-pix" className="text-xs font-semibold text-suave uppercase">
                Chave PIX manual (usada só se o Mercado Pago não estiver configurado)
              </label>
              <input id="aj-pix" name="chave_pix" defaultValue={getConfig("chave_pix")}
                placeholder="CNPJ, telefone ou chave aleatória"
                className="h-12 rounded-xl bg-fundo border border-borda px-3 num w-full" />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="aj-mp" className="text-xs font-semibold text-amber-300 uppercase">
                Mercado Pago — Access Token de produção
              </label>
              <input id="aj-mp" name="mp_access_token" defaultValue={getConfig("mp_access_token")}
                placeholder="APP_USR-..." autoComplete="off"
                className="h-12 rounded-xl bg-fundo border border-cta/40 px-3 num w-full" />
              <p className="text-[11px] text-suave leading-relaxed">
                Com o token preenchido, ticket de <strong className="text-texto">PARTICULAR</strong> só sai depois
                do pagamento aprovado (QR PIX na tela ou link de cartão).
                Para pegar o token: entre em <span className="text-texto">mercadopago.com.br</span> →{" "}
                <span className="text-texto">Seu negócio → Configurações → Credenciais</span> → copie o{" "}
                <span className="text-texto">Access Token de produção</span> (começa com APP_USR).
                Deixe vazio para emitir sem cobrança automática.
              </p>
            </div>
            <button type="submit"
              className="h-12 px-5 rounded-xl bg-cta text-cta-texto font-bold flex items-center gap-2 w-fit cursor-pointer transition-colors duration-200 hover:bg-amber-400">
              <Save className="w-5 h-5" aria-hidden /> Salvar ajustes
            </button>
          </form>
        </Cartao>

        <Cartao className="p-5">
          <h2 className="font-bold mb-4">Trocar senha de acesso</h2>
          <TrocarSenhaForm />
        </Cartao>

        <Cartao className="p-5">
          <h2 className="font-bold mb-2">Logo do ticket</h2>
          <p className="text-suave text-sm">
            Substitua o arquivo <code className="num text-texto">public/logo.png</code> pela logo oficial
            (imagem quadrada, fundo branco ou transparente). Ela aparece no canto superior esquerdo do ticket
            impresso e do PDF. Enquanto isso, um placeholder é usado.
          </p>
        </Cartao>
      </div>
    </>
  );
}

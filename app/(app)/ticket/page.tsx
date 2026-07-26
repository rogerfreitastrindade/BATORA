import { listarEmpresasSemSenha, nomesClientes } from "@/lib/queries";
import { getConfig, precoAvulso } from "@/lib/db";
import { mpConfigurado } from "@/lib/mercadopago";
import { sessaoAtual } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Titulo, Cartao } from "@/components/ui";
import { TicketForm } from "@/components/ticket-form";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NovoTicket() {
  const sessao = await sessaoAtual();
  const particular = sessao?.papel === "part";
  let empresaFixa: { nome: string; valor: number } | undefined;
  if (sessao?.papel === "emp" && sessao.empresaId) {
    const e = getDb().prepare("SELECT nome, valor_pesagem FROM empresas WHERE id = ?").get(sessao.empresaId) as
      | { nome: string; valor_pesagem: number }
      | undefined;
    if (e) empresaFixa = { nome: e.nome, valor: e.valor_pesagem };
  }
  const admin = sessao?.papel === "admin";
  const empresas = admin ? listarEmpresasSemSenha() : [];
  return (
    <>
      <Titulo
        acao={
          admin ? (
            <Link href="/ticket/whatsapp"
              className="h-11 px-4 rounded-xl border border-ok/40 bg-ok/10 text-green-300 font-bold flex items-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-ok/20">
              <MessageCircle className="w-5 h-5" aria-hidden /> Modo WhatsApp
            </Link>
          ) : undefined
        }
      >
        {particular ? "Pedir pesagem — pagamento à vista" : "Novo ticket de pesagem"}
      </Titulo>
      <p className="text-suave mb-4 max-w-3xl">
        {particular ? (
          <>Preencha seus dados, pague por <strong className="text-texto">PIX ou cartão</strong> e
          aguarde: a balança lança o peso bruto e o <strong className="text-texto">ticket abre na
          sua tela</strong> para baixar o PDF.</>
        ) : (
          <>Preencha os pesos que o <strong className="text-texto">líquido sai sozinho</strong>. Ao gerar,
          o ticket ganha número, entra no histórico do cliente e a pesagem é registrada no controle
          mensal — tudo com data e hora.</>
        )}
      </p>
      <Cartao className={`p-5 max-w-3xl ${particular ? "border-ok/40" : ""}`}>
        <TicketForm empresas={empresas} chavePix={admin ? getConfig("chave_pix") : ""} precoAvulso={precoAvulso()}
          modo="completo" nomesClientes={admin ? nomesClientes() : []} mpAtivo={mpConfigurado()}
          empresaFixa={empresaFixa} particular={particular} />
      </Cartao>
    </>
  );
}

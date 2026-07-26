import { listarEmpresasSemSenha, nomesClientes } from "@/lib/queries";
import { getConfig, precoAvulso } from "@/lib/db";
import { mpConfigurado } from "@/lib/mercadopago";
import { Titulo, Cartao } from "@/components/ui";
import { TicketForm } from "@/components/ticket-form";
import { MessageCircle } from "lucide-react";

import { exigirAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function TicketWhatsApp() {
  await exigirAdmin();
  const empresas = listarEmpresasSemSenha();
  return (
    <>
      <Titulo>
        <span className="flex items-center gap-2">
          <MessageCircle className="w-7 h-7 text-green-400" aria-hidden />
          Modo WhatsApp
        </span>
      </Titulo>
      <p className="text-suave mb-4 max-w-xl">
        Pergunte na ordem: <strong className="text-texto">Nome → Placa → Tara → Material</strong>,
        depois leia o <strong className="text-amber-300">Bruto</strong> no visor da câmera.
        Ao gerar, baixe o PDF e envie pelo WhatsApp.
      </p>
      <Cartao className="p-5 max-w-xl border-ok/40">
        <TicketForm empresas={empresas} chavePix={getConfig("chave_pix")} precoAvulso={precoAvulso()}
          modo="whatsapp" nomesClientes={nomesClientes()} mpAtivo={mpConfigurado()} />
      </Cartao>
    </>
  );
}

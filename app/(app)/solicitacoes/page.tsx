import { getDb } from "@/lib/db";
import { exigirAdmin } from "@/lib/auth";
import { recusarSolicitacao } from "@/lib/actions";
import { fmtData, fmtNum } from "@/lib/format";
import { Titulo, Cartao } from "@/components/ui";
import { LancarBrutoForm } from "@/components/lancar-bruto";
import { AutoRefresh } from "@/components/auto-refresh";
import { Bell, XCircle, Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

type Solicitacao = {
  id: number; cliente: string; placa: string; motorista: string | null; material: string | null;
  tara: number; data_entrada: string; hora_entrada: string | null; criado_em: string;
  empresa: string; pago_via: string | null; valor: number | null;
  pagamento_id: number | null; pago: number; pago_em: string | null;
};

export default async function Solicitacoes() {
  await exigirAdmin();
  const pendentes = getDb().prepare(`
    SELECT s.id, s.cliente, s.placa, s.motorista, s.material, s.tara,
      s.data_entrada, s.hora_entrada, s.criado_em, s.pago_via, s.valor,
      s.pagamento_id, s.pago, s.pago_em,
      COALESCE(e.nome, 'PARTICULAR') AS empresa
    FROM solicitacoes s LEFT JOIN empresas e ON e.id = s.empresa_id
    WHERE s.status = 'AGUARDANDO'
    ORDER BY s.id
  `).all() as Solicitacao[];

  return (
    <>
      <AutoRefresh />
      <Titulo>
        <span className="flex items-center gap-2">
          <Bell className="w-7 h-7 text-cta" aria-hidden /> Aguardando peso bruto
        </span>
      </Titulo>
      <p className="text-suave mb-5 max-w-2xl">
        Quando uma empresa conveniada pede um ticket, ela aparece aqui na hora (o sino toca).
        Leia o <strong className="text-amber-300">peso bruto no visor da balança</strong>, digite e
        emita — o ticket sai com data e hora de agora e aparece na tela da empresa sozinho.
      </p>

      {pendentes.length === 0 && (
        <Cartao className="p-8 text-center text-suave">
          Nenhuma solicitação aguardando. Quando chegar, o sino no topo avisa com som.
        </Cartao>
      )}

      <div className="flex flex-col gap-4 max-w-3xl">
        {pendentes.map((s) => (
          <Cartao key={s.id} className="p-4 border-cta/40">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
              <p className="font-bold text-lg">
                {s.empresa}
                {s.pagamento_id && s.pago === 1 && (
                  <span className="ml-2 text-xs font-bold text-green-300 bg-ok/15 border border-ok/30 rounded-md px-2 py-0.5">
                    PAGO — Mercado Pago{s.pago_em ? ` às ${s.pago_em.slice(11, 16)}` : ""}
                  </span>
                )}
                {s.pagamento_id && s.pago === 0 && (
                  <span className="ml-2 text-xs font-bold text-amber-300 bg-cta/15 border border-cta/40 rounded-md px-2 py-0.5 inline-flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
                    EM PROCESSO — aguardando pagamento
                  </span>
                )}
                {s.pago_via === "NA_BALANCA" && (
                  <span className="ml-2 text-xs font-bold text-amber-300 bg-cta/15 border border-cta/40 rounded-md px-2 py-0.5">
                    COBRAR NA BALANÇA{s.valor ? ` — R$ ${s.valor.toFixed(2).replace(".", ",")}` : ""}
                  </span>
                )}
              </p>
              <p className="text-suave text-xs num">
                pedido em {fmtData(s.criado_em.slice(0, 10))} às {s.criado_em.slice(11, 16)}
              </p>
            </div>
            <p className="text-suave text-sm num mb-3">
              {s.cliente} · placa <strong className="text-texto">{s.placa}</strong>
              {s.motorista ? ` · motorista ${s.motorista}` : ""}
              {s.material ? ` · ${s.material}` : ""}
              {" · entrada "}{fmtData(s.data_entrada)}{s.hora_entrada ? ` às ${s.hora_entrada}` : ""}
            </p>
            <p className="text-sm mb-3">
              <span className="text-suave uppercase text-xs font-semibold">Tara (peso vazio): </span>
              <strong className="num">{fmtNum(s.tara)} kg</strong>
            </p>
            {s.pagamento_id && s.pago === 0 ? (
              <div className="rounded-xl bg-superficie-2 border border-borda px-4 py-3 flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-cta shrink-0" aria-hidden />
                <p className="text-sm text-suave">
                  <strong className="text-amber-300">Aguardando o pagamento do cliente.</strong>{" "}
                  O campo do peso bruto libera sozinho assim que o Mercado Pago aprovar
                  {s.valor ? ` (R$ ${s.valor.toFixed(2).replace(".", ",")})` : ""}.
                </p>
              </div>
            ) : (
              <LancarBrutoForm id={s.id} tara={s.tara} />
            )}
            <form action={recusarSolicitacao} className="mt-3">
              <input type="hidden" name="id" value={s.id} />
              <button type="submit"
                className="h-11 px-4 rounded-lg border border-perigo/40 text-red-300 text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-perigo/10">
                <XCircle className="w-4 h-4" aria-hidden /> Recusar solicitação
              </button>
            </form>
          </Cartao>
        ))}
      </div>
    </>
  );
}

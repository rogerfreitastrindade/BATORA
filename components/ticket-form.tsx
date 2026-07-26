"use client";

import { useActionState, useMemo, useState } from "react";
import { criarTicket, criarSolicitacao, criarSolicitacaoParticular } from "@/lib/actions";
import type { Empresa } from "@/lib/queries";
import { fmtBRL } from "@/lib/format";
import { Copy, Check, FileText, Lock, QrCode, CreditCard, Banknote, AlertTriangle } from "lucide-react";

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function agora() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const campo = "h-12 rounded-xl bg-fundo border border-borda px-3 text-base w-full";
const rotulo = "text-xs font-semibold text-suave uppercase";

export function TicketForm({
  empresas, chavePix, precoAvulso, modo, nomesClientes, mpAtivo, empresaFixa, particular = false,
}: {
  empresas: Empresa[]; chavePix: string; precoAvulso: number;
  modo: "completo" | "whatsapp"; nomesClientes: string[]; mpAtivo: boolean;
  /** sessão de empresa: emite só para ela, sem senha (já autenticou no login) */
  empresaFixa?: { nome: string; valor: number };
  /** sessão de cliente particular (botão da tela inicial): paga à vista antes */
  particular?: boolean;
}) {
  const [estadoT, actionTicket, pendenteT] = useActionState(criarTicket, null);
  const [estadoS, actionSolicitacao, pendenteS] = useActionState(criarSolicitacao, null);
  const [estadoP, actionParticular, pendenteP] = useActionState(criarSolicitacaoParticular, null);
  const estado = particular ? estadoP : empresaFixa ? estadoS : estadoT;
  const pendente = particular ? pendenteP : empresaFixa ? pendenteS : pendenteT;
  const [tara, setTara] = useState("");
  const [bruto, setBruto] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [forma, setForma] = useState("PIX");
  const [copiado, setCopiado] = useState(false);

  const liquido = useMemo(() => {
    const t = parseFloat(tara.replace(",", "."));
    const b = parseFloat(bruto.replace(",", "."));
    if (isNaN(t) || isNaN(b)) return null;
    return b - t;
  }, [tara, bruto]);

  const empresa = empresas.find((e) => String(e.id) === empresaId);
  const valor = empresaFixa ? empresaFixa.valor : empresa ? empresa.valor_pesagem : precoAvulso;
  const whats = modo === "whatsapp";
  const ehParticular = !particular && !empresaFixa && empresaId === "";
  const semBruto = Boolean(empresaFixa) || particular; // bruto é lançado só pelo administrador

  async function copiarPix() {
    try {
      await navigator.clipboard.writeText(chavePix);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* clipboard indisponível */ }
  }

  const FORMAS_PARTICULAR = [
    { valor: "PIX", rotulo: "PIX", Icone: QrCode },
    { valor: "CARTAO", rotulo: "CARTÃO", Icone: CreditCard },
    { valor: "DINHEIRO", rotulo: "DINHEIRO", Icone: Banknote },
  ] as const;

  return (
    <form action={particular ? actionParticular : empresaFixa ? actionSolicitacao : actionTicket} className="flex flex-col gap-4">
      {whats && <input type="hidden" name="auto_pdf" value="1" />}
      <div className={`grid gap-3 ${whats ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3"}`}>
        <div className="flex flex-col gap-1">
          <label htmlFor="t-cliente" className={rotulo}>{whats ? "1. Nome do cliente" : "Cliente"}</label>
          <input id="t-cliente" name="cliente" list="t-cliente-lista" required autoComplete="off"
            defaultValue={empresaFixa ? empresaFixa.nome : ""}
            placeholder="Digite para buscar ou cadastrar" autoFocus={whats}
            className={`${campo} uppercase`} />
          <datalist id="t-cliente-lista">
            {nomesClientes.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <p className="text-[11px] text-suave">
            {particular
              ? "Digite seu nome completo — ele sai impresso no ticket."
              : empresaFixa
              ? "Já preenchido com o nome da sua empresa — ajuste se o ticket for para outro nome."
              : "Digite para buscar um cliente já cadastrado. Nome novo entra no cadastro sozinho."}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="t-placa" className={rotulo}>{whats ? "2. Placa" : "Placa"}</label>
          <input id="t-placa" name="placa" required placeholder="ABC1D23" autoCapitalize="characters"
            className={`${campo} uppercase num`} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="t-tara" className={rotulo}>{whats ? "3. Tara — peso vazio (kg)" : "Tara — peso vazio (kg)"}</label>
          <input id="t-tara" name="tara" required inputMode="decimal" placeholder="0"
            value={tara} onChange={(e) => setTara(e.target.value)} className={`${campo} num`} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="t-material" className={rotulo}>{whats ? "4. Material" : "Material"}</label>
          <input id="t-material" name="material" placeholder="EX.: PEDRA, SUCATA" className={`${campo} uppercase`} />
        </div>
        {!semBruto && (
          <div className="flex flex-col gap-1">
            <label htmlFor="t-bruto" className={`${rotulo} ${whats ? "text-amber-300" : ""}`}>
              {whats ? "5. Bruto — leia no visor (kg)" : "Bruto — peso carregado (kg)"}
            </label>
            <input id="t-bruto" name="bruto" required inputMode="decimal" placeholder="0"
              value={bruto} onChange={(e) => setBruto(e.target.value)}
              className={`${campo} num ${whats ? "border-cta text-xl font-bold" : ""}`} />
          </div>
        )}
        {!whats && (
          <div className="flex flex-col gap-1">
            <label htmlFor="t-motorista" className={rotulo}>Motorista</label>
            <input id="t-motorista" name="motorista" placeholder="NOME DO MOTORISTA" className={`${campo} uppercase`} />
          </div>
        )}
      </div>

      {semBruto && (
        <div className="rounded-xl bg-cta/10 border border-cta/40 px-4 py-3">
          <p className="text-sm text-suave">
            <strong className="text-amber-300">Peso bruto:</strong> quem lança é a balança.
            Ao enviar, o operador recebe um aviso na hora, lê o bruto no visor e emite o ticket —
            esta tela mostra o ticket pronto sozinha.
          </p>
        </div>
      )}

      {!semBruto && (
      <div className="rounded-xl bg-superficie-2 border border-borda px-4 py-3 flex items-center justify-between">
        <span className="text-suave text-sm font-semibold uppercase">Líquido (bruto − tara)</span>
        <span className="num text-2xl font-bold">
          {liquido === null ? "—" : `${liquido.toLocaleString("pt-BR")} kg`}
        </span>
      </div>
      )}

      <div className={`grid gap-3 ${whats ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}>
        <div className="flex flex-col gap-1">
          <label htmlFor="t-de" className={rotulo}>Data entrada</label>
          <input id="t-de" name="data_entrada" type="date" required defaultValue={hojeISO()} className={`${campo} num`} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="t-he" className={rotulo}>Hora entrada</label>
          <input id="t-he" name="hora_entrada" type="time" defaultValue={agora()} className={`${campo} num`} />
        </div>
        {!semBruto && (<>
        <div className="flex flex-col gap-1">
          <label htmlFor="t-ds" className={rotulo}>Data saída</label>
          <input id="t-ds" name="data_saida" type="date" defaultValue={hojeISO()} className={`${campo} num`} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="t-hs" className={rotulo}>Hora saída</label>
          <input id="t-hs" name="hora_saida" type="time" defaultValue={agora()} className={`${campo} num`} />
        </div>
        </>)}
      </div>

      {particular ? (
        mpAtivo ? (
          <div className="flex flex-col gap-1">
            <span className={rotulo}>Como você vai pagar?</span>
            <div className="flex gap-2" role="radiogroup" aria-label="Forma de pagamento">
              {FORMAS_PARTICULAR.filter((f) => f.valor !== "DINHEIRO").map(({ valor: f, rotulo: r, Icone }) => (
                <label key={f}
                  className={`flex-1 h-12 rounded-xl border flex items-center justify-center gap-1.5 font-bold text-sm cursor-pointer transition-colors duration-200 ${
                    forma === f ? "bg-primaria-forte border-primaria text-white" : "bg-fundo border-borda text-suave hover:text-texto"
                  }`}>
                  <input type="radio" name="forma" value={f} checked={forma === f}
                    onChange={() => setForma(f)} className="sr-only" />
                  <Icone className="w-4 h-4" aria-hidden />
                  {r}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-suave">
              {forma === "PIX"
                ? "Você recebe o QR Code PIX na próxima tela — o pedido segue para a balança assim que o pagamento aprovar."
                : "Você recebe um link do Mercado Pago para pagar no cartão — o pedido segue para a balança assim que aprovar."}
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-cta/10 border border-cta/40 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm text-suave">
              O pagamento (PIX ou dinheiro) será acertado <strong className="text-texto">na balança</strong> na hora da pesagem.
            </p>
          </div>
        )
      ) : empresaFixa ? (
        <div className="rounded-xl bg-primaria/10 border border-primaria/40 px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-blue-300">MENSAL — {empresaFixa.nome}</span>
          <span className="num text-sm text-suave">{fmtBRL(empresaFixa.valor)}/pesagem</span>
        </div>
      ) : (
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="t-empresa" className={rotulo}>Empresa (conveniada) ou particular</label>
          <select id="t-empresa" name="empresa_id" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}
            className={`${campo} cursor-pointer`}>
            <option value="">PARTICULAR (paga na hora)</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>{e.nome} — {fmtBRL(e.valor_pesagem)}/pesagem</option>
            ))}
          </select>
        </div>

        {empresaId === "" ? (
          <div className="flex flex-col gap-1">
            <span className={rotulo}>Forma de pagamento</span>
            <div className="flex gap-2" role="radiogroup" aria-label="Forma de pagamento">
              {FORMAS_PARTICULAR.map(({ valor: f, rotulo: r, Icone }) => (
                <label key={f}
                  className={`flex-1 h-12 rounded-xl border flex items-center justify-center gap-1.5 font-bold text-sm cursor-pointer transition-colors duration-200 ${
                    forma === f ? "bg-primaria-forte border-primaria text-white" : "bg-fundo border-borda text-suave hover:text-texto"
                  }`}>
                  <input type="radio" name="forma" value={f} checked={forma === f}
                    onChange={() => setForma(f)} className="sr-only" />
                  <Icone className="w-4 h-4" aria-hidden />
                  {r}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label htmlFor="t-senha" className={`${rotulo} text-amber-300`}>
              Senha da {empresa?.nome}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-suave" aria-hidden />
              <input id="t-senha" name="senha_empresa" type="password" required inputMode="numeric"
                placeholder="Senha única da empresa"
                className={`${campo} pl-9 num tracking-widest`} />
            </div>
            <p className="text-[11px] text-suave">
              Cada conveniada tem uma senha única. Sem ela o ticket não sai — o motorista deve saber a senha.
            </p>
          </div>
        )}
      </div>
      )}

      {!empresaFixa && empresaId !== "" && (
        <div className="rounded-xl bg-primaria/10 border border-primaria/40 px-4 py-3 flex items-center justify-between">
          <span className="font-semibold text-blue-300">MENSAL — {empresa?.nome}</span>
          <span className="num text-sm text-suave">{fmtBRL(valor)}/pesagem</span>
        </div>
      )}

      {ehParticular && (forma === "PIX" || forma === "CARTAO") && mpAtivo && (
        <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-4 py-3 flex items-start gap-3">
          {forma === "PIX"
            ? <QrCode className="w-5 h-5 text-cyan-300 shrink-0 mt-0.5" aria-hidden />
            : <CreditCard className="w-5 h-5 text-cyan-300 shrink-0 mt-0.5" aria-hidden />}
          <p className="text-sm text-suave">
            <strong className="text-cyan-300">Pagamento antes do ticket:</strong> ao continuar, o sistema gera a
            cobrança no <strong className="text-texto">Mercado Pago</strong>{forma === "PIX"
              ? " com QR Code PIX na tela"
              : " com link para pagar no cartão"}.
            O ticket é emitido <strong className="text-texto">sozinho</strong> assim que o pagamento for aprovado.
          </p>
        </div>
      )}

      {ehParticular && forma === "CARTAO" && !mpAtivo && (
        <div className="rounded-xl bg-cta/10 border border-cta/40 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-suave">
            Para cobrar no cartão, cole o <strong className="text-texto">Access Token do Mercado Pago</strong> em
            Ajustes. Enquanto isso, use PIX ou DINHEIRO.
          </p>
        </div>
      )}

      {ehParticular && forma === "PIX" && !mpAtivo && (
        <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-40">
            <p className="text-xs font-semibold text-cyan-300 uppercase">Chave PIX para o cliente</p>
            <p className="num text-lg break-all">{chavePix || "Cadastre a chave PIX em Ajustes"}</p>
          </div>
          {chavePix && (
            <button type="button" onClick={copiarPix}
              className="h-11 px-4 rounded-lg bg-cyan-600 text-white font-bold flex items-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-cyan-500">
              {copiado ? <Check className="w-4 h-4" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
              {copiado ? "Copiado!" : "Copiar"}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl bg-superficie-2 border border-borda px-4 py-3">
        <span className="text-suave text-sm font-semibold uppercase">Valor da pesagem</span>
        <span className="num text-xl font-bold text-amber-300">{fmtBRL(valor)}</span>
      </div>

      {estado?.erro && (
        <p role="alert" className="rounded-xl bg-perigo/10 border border-perigo/40 text-red-300 px-4 py-3 font-semibold">
          {estado.erro}
        </p>
      )}

      <button type="submit" disabled={pendente}
        className="h-14 rounded-xl bg-cta text-cta-texto font-bold text-lg flex items-center justify-center gap-2 cursor-pointer transition-colors duration-200 hover:bg-amber-400 disabled:opacity-60">
        <FileText className="w-6 h-6" aria-hidden />
        {pendente
          ? "Processando…"
          : particular
            ? mpAtivo ? "Pagar e pedir o ticket" : "Pedir o ticket (pagar na balança)"
            : empresaFixa
            ? "Enviar para a balança lançar o bruto"
            : ehParticular && (forma === "PIX" || forma === "CARTAO") && mpAtivo
              ? "Gerar cobrança e ticket"
              : `Gerar ticket ${whats ? "e baixar PDF" : ""}`}
      </button>
      <p className="text-suave text-sm text-center">
        {particular
          ? "Depois do pagamento, a balança lança o peso bruto e o ticket abre na sua tela para baixar o PDF."
          : empresaFixa
          ? "Depois que a balança lançar o bruto, o ticket abre nesta tela com o número do mês."
          : "A pesagem entra automaticamente no controle mensal com o próximo número do mês, com data e hora."}
      </p>
    </form>
  );
}

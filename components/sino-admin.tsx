"use client";

/* Sino do administrador: verifica a cada 5 s se há tickets aguardando o peso bruto.
   Quando chega solicitação nova: toca um bip, vibra (celular) e dispara a notificação
   do navegador — além do selo vermelho no sino. */
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell } from "lucide-react";

type Item = { id: number; cliente: string; placa: string; empresa: string };

function bip() {
  try {
    const ctx = new AudioContext();
    const tocar = (t: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    };
    tocar(0, 880);
    tocar(0.35, 1174);
  } catch { /* áudio bloqueado até a primeira interação */ }
}

export function SinoAdmin() {
  const [qtd, setQtd] = useState(0);
  const [itens, setItens] = useState<Item[]>([]);
  const anterior = useRef<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let ativo = true;
    async function verificar() {
      try {
        const res = await fetch("/api/solicitacoes", { cache: "no-store" });
        if (!res.ok) return;
        const dados = await res.json();
        if (!ativo) return;
        setQtd(dados.qtd);
        setItens(dados.itens || []);
        if (anterior.current !== null && dados.qtd > anterior.current) {
          bip();
          if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
          const novo = (dados.itens || [])[0];
          if (typeof Notification !== "undefined" && Notification.permission === "granted" && novo) {
            new Notification("BATORA — lançar peso bruto", {
              body: `${novo.empresa} · ${novo.cliente} · placa ${novo.placa}`,
              tag: "batora-solicitacao",
            });
          }
        }
        anterior.current = dados.qtd;
      } catch { /* sem rede agora */ }
    }
    verificar();
    const timer = setInterval(verificar, 5000);
    return () => { ativo = false; clearInterval(timer); };
  }, []);

  // recarrega a lista da página de solicitações quando chega coisa nova nela
  useEffect(() => {
    if (pathname === "/solicitacoes") router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qtd]);

  function abrir() {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    router.push("/solicitacoes");
  }

  return (
    <button
      type="button"
      onClick={abrir}
      aria-label={qtd > 0 ? `${qtd} tickets aguardando peso bruto` : "Solicitações de ticket"}
      title={itens.map((i) => `${i.empresa} · ${i.placa}`).join("\n") || "Nenhuma solicitação pendente"}
      className={`relative w-11 h-11 flex items-center justify-center rounded-lg cursor-pointer transition-colors duration-200 ${
        qtd > 0 ? "text-amber-300 hover:bg-cta/10" : "text-suave hover:text-texto hover:bg-superficie-2"
      }`}
    >
      <Bell className={`w-6 h-6 ${qtd > 0 ? "animate-pulse" : ""}`} aria-hidden />
      {qtd > 0 && (
        <span className="absolute top-1 right-1 min-w-5 h-5 px-1 rounded-full bg-perigo text-white text-[11px] font-bold flex items-center justify-center">
          {qtd}
        </span>
      )}
    </button>
  );
}

"use client";

/* Recarrega os dados da página sozinho (ex.: pagamento aprovado muda o cartão na hora). */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ intervaloMs = 5000 }: { intervaloMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), intervaloMs);
    return () => clearInterval(timer);
  }, [router, intervaloMs]);
  return null;
}

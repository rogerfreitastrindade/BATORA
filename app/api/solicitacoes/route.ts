import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sessaoAtual } from "@/lib/auth";

// Sino do administrador: quantidade e lista de solicitações aguardando o peso bruto.
export async function GET() {
  const s = await sessaoAtual();
  if (!s || s.papel !== "admin") {
    return NextResponse.json({ erro: "sem permissão" }, { status: 401 });
  }
  const itens = getDb().prepare(`
    SELECT s.id, s.cliente, s.placa, s.criado_em, COALESCE(e.nome, 'PARTICULAR') AS empresa
    FROM solicitacoes s LEFT JOIN empresas e ON e.id = s.empresa_id
    WHERE s.status = 'AGUARDANDO'
    ORDER BY s.id DESC
  `).all();
  return NextResponse.json({ qtd: itens.length, itens });
}

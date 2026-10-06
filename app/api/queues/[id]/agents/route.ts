import { NextResponse } from "next/server";
import { agentsByQueue, informixConfigured } from "@/lib/informix";
import { getAgents, UccxError } from "@/lib/uccx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/queues/[id]/agents?team=<id>
// Fonte principal: banco — atendentes com a skill da fila, sem depender de time.
// Fallback: time do Finesse (do cadastro, ou o padrão do .env).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (informixConfigured()) {
    const agents = await agentsByQueue(params.id);
    if (agents) return NextResponse.json({ ok: true, source: "informix", count: agents.length, agents });
  }

  const team = new URL(req.url).searchParams.get("team") || undefined;
  try {
    const agents = await getAgents(team);
    return NextResponse.json({ ok: true, source: "finesse", count: agents.length, agents });
  } catch (e: any) {
    const status = e instanceof UccxError ? e.status : 0;
    return NextResponse.json({ ok: false, status, error: e?.message || "Falha" }, { status: 502 });
  }
}

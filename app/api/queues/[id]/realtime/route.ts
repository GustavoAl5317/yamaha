import { NextResponse } from "next/server";
import { getQueueRealtime } from "@/lib/uccx";
import { getLive, informixConfigured } from "@/lib/informix";
import type { QueueLive } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/queues/[id]/realtime?name=Help_Desk_csq
// Fonte principal: Informix (KPIs do dia + instantâneo). Fallback: Finesse.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const name = new URL(req.url).searchParams.get("name") || "";

  if (informixConfigured()) {
    const live = await getLive(params.id, name);
    // Usa o banco se ele conectou (mesmo que o instantâneo esteja indisponível,
    // os KPIs do dia já são reais).
    if (live.source === "informix") return NextResponse.json(live);
  }

  // Fallback: Finesse (só instantâneo, sem KPIs históricos).
  const finesse = await getQueueRealtime(params.id);
  const resp: QueueLive = { source: "finesse", ts: Date.now(), kpis: null, instant: finesse };
  return NextResponse.json(resp);
}

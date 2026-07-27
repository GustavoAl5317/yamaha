import { NextResponse } from "next/server";
import { getQueueRealtime } from "@/lib/uccx";
import { getSnapshotByName, informixConfigured } from "@/lib/informix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/queues/[id]/realtime?name=Help_Desk_csq
// Prioriza o banco Informix (db_cra); se indisponível, cai no Finesse.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const name = new URL(req.url).searchParams.get("name");

  if (name && informixConfigured()) {
    const db = await getSnapshotByName(name);
    // Só usa o banco se ele trouxe dado real; senão tenta o Finesse.
    if (db && db.available) return NextResponse.json({ ...db, source: "informix" });
  }

  const finesse = await getQueueRealtime(params.id);
  return NextResponse.json({ ...finesse, source: "finesse" });
}

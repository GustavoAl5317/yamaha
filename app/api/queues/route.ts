import { NextResponse } from "next/server";
import { getQueues, UccxError } from "@/lib/uccx";
import { listQueues, informixConfigured } from "@/lib/informix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // 1) Preferir o banco Informix (não depende da conta de API).
  if (informixConfigured()) {
    const db = await listQueues();
    if (db.length > 0) {
      return NextResponse.json({ ok: true, count: db.length, queues: db, source: "informix" });
    }
  }
  // 2) Fallback: adminapi.
  try {
    const queues = await getQueues();
    return NextResponse.json({ ok: true, count: queues.length, queues, source: "adminapi" });
  } catch (e: any) {
    const status = e instanceof UccxError ? e.status : 0;
    return NextResponse.json(
      { ok: false, status, error: e?.message || "Falha ao listar filas (banco e adminapi indisponíveis)" },
      { status: 502 },
    );
  }
}

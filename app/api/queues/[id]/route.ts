import { NextResponse } from "next/server";
import { getQueue, UccxError } from "@/lib/uccx";
import { listQueues, informixConfigured } from "@/lib/informix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  // 1) Config vinda do banco (não depende da conta de API).
  if (informixConfigured()) {
    const all = await listQueues();
    const q = all.find((x) => x.id === params.id);
    if (q) return NextResponse.json({ ok: true, queue: q, source: "informix" });
    if (all.length > 0) return NextResponse.json({ ok: false, error: "Fila não encontrada" }, { status: 404 });
  }
  // 2) Fallback: adminapi.
  try {
    const queue = await getQueue(params.id);
    if (!queue) return NextResponse.json({ ok: false, error: "Fila não encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true, queue, source: "adminapi" });
  } catch (e: any) {
    const status = e instanceof UccxError ? e.status : 0;
    return NextResponse.json({ ok: false, status, error: e?.message || "Falha" }, { status: 502 });
  }
}

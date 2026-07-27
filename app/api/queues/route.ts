import { NextResponse } from "next/server";
import { getQueues, UccxError } from "@/lib/uccx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const queues = await getQueues();
    return NextResponse.json({ ok: true, count: queues.length, queues });
  } catch (e: any) {
    const status = e instanceof UccxError ? e.status : 0;
    return NextResponse.json(
      { ok: false, status, error: e?.message || "Falha ao listar filas" },
      { status: 502 },
    );
  }
}

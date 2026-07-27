import { NextResponse } from "next/server";
import { getQueue, UccxError } from "@/lib/uccx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const queue = await getQueue(params.id);
    if (!queue) return NextResponse.json({ ok: false, error: "Fila não encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true, queue });
  } catch (e: any) {
    const status = e instanceof UccxError ? e.status : 0;
    return NextResponse.json({ ok: false, status, error: e?.message || "Falha" }, { status: 502 });
  }
}

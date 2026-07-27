import { NextResponse } from "next/server";
import { getAgents, UccxError } from "@/lib/uccx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const agents = await getAgents();
    return NextResponse.json({ ok: true, count: agents.length, agents });
  } catch (e: any) {
    const status = e instanceof UccxError ? e.status : 0;
    return NextResponse.json({ ok: false, status, error: e?.message || "Falha" }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { getTeams, UccxError } from "@/lib/uccx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/teams — times do Finesse, para escolher os atendentes de cada dashboard.
export async function GET() {
  try {
    const teams = await getTeams();
    return NextResponse.json({ ok: true, teams });
  } catch (e: any) {
    const status = e instanceof UccxError ? e.status : 0;
    return NextResponse.json({ ok: false, status, error: e?.message || "Falha" }, { status: 502 });
  }
}

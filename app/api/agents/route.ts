import { NextResponse } from "next/server";
import { getAgents, UccxError } from "@/lib/uccx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/agents?team=<id> — sem team, usa o time padrão (FINESSE_TEAM_ID).
export async function GET(req: Request) {
  const team = new URL(req.url).searchParams.get("team") || undefined;
  try {
    const agents = await getAgents(team);
    return NextResponse.json({ ok: true, count: agents.length, agents });
  } catch (e: any) {
    const status = e instanceof UccxError ? e.status : 0;
    return NextResponse.json({ ok: false, status, error: e?.message || "Falha" }, { status: 502 });
  }
}

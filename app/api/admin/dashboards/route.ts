import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { createDashboard, listDashboards } from "@/lib/dashboards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const denied = () => NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });

export async function GET() {
  if (!isAdmin()) return denied();
  return NextResponse.json({ ok: true, dashboards: listDashboards() });
}

export async function POST(req: Request) {
  if (!isAdmin()) return denied();
  const b = await req.json().catch(() => ({}));
  const title = String(b?.title ?? "").trim();
  const csqId = String(b?.csqId ?? "").trim();
  const csqName = String(b?.csqName ?? "").trim();
  if (!title || !csqId || !csqName) {
    return NextResponse.json({ ok: false, error: "Informe título e fila" }, { status: 400 });
  }
  const cfg = createDashboard({
    title, csqId, csqName,
    teamId: b?.teamId ? String(b.teamId) : undefined,
    teamName: b?.teamName ? String(b.teamName) : undefined,
    blocks: b?.blocks,
  });
  return NextResponse.json({ ok: true, dashboard: cfg });
}

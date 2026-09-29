import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { deleteDashboard, updateDashboard } from "@/lib/dashboards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const denied = () => NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  if (!isAdmin()) return denied();
  const patch = await req.json().catch(() => ({}));
  const cfg = updateDashboard(params.slug, patch);
  if (!cfg) return NextResponse.json({ ok: false, error: "Dashboard não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true, dashboard: cfg });
}

export async function DELETE(_req: Request, { params }: { params: { slug: string } }) {
  if (!isAdmin()) return denied();
  if (!deleteDashboard(params.slug)) {
    return NextResponse.json({ ok: false, error: "Dashboard não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

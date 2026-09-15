import { NextResponse } from "next/server";
import { getAbandoned, informixConfigured } from "@/lib/informix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/queues/[id]/abandoned?day=YYYY-MM-DD  (sem "day" = hoje)
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const day = new URL(req.url).searchParams.get("day");
  if (day && !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json({ ok: false, error: "Parâmetro day deve ser YYYY-MM-DD" }, { status: 400 });
  }
  if (!informixConfigured()) return NextResponse.json({ ok: true, day, abandoned: [] });
  const abandoned = await getAbandoned(params.id, day);
  return NextResponse.json({ ok: true, day, abandoned });
}

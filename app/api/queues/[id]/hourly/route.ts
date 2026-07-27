import { NextResponse } from "next/server";
import { getHourly, informixConfigured } from "@/lib/informix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!informixConfigured()) return NextResponse.json({ ok: true, hourly: [] });
  const hourly = await getHourly(params.id);
  return NextResponse.json({ ok: true, hourly });
}

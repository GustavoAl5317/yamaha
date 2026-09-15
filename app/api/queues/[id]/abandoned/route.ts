import { NextResponse } from "next/server";
import { getAbandoned, informixConfigured } from "@/lib/informix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!informixConfigured()) return NextResponse.json({ ok: true, abandoned: [] });
  const abandoned = await getAbandoned(params.id);
  return NextResponse.json({ ok: true, abandoned });
}

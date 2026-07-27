import { NextResponse } from "next/server";
import { ping, uccxInfo } from "@/lib/uccx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = await ping();
  return NextResponse.json({ ...status, info: uccxInfo });
}

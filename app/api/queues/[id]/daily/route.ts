import { NextResponse } from "next/server";
import { getDaily } from "@/lib/informix";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const daily = await getDaily(params.id);
    return NextResponse.json({ ok: true, daily });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}

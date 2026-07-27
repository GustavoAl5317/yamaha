import { NextResponse } from "next/server";
import { ping, uccxInfo } from "@/lib/uccx";
import { informixConfigured, pingInformix } from "@/lib/informix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// O status de conexão reflete a FONTE REAL (banco db_cra), não a conta de API.
export async function GET() {
  if (informixConfigured()) {
    const db = await pingInformix();
    if (db.ok) {
      return NextResponse.json({ ok: true, source: "informix", message: db.message, info: uccxInfo });
    }
    // Se o banco falhou, ainda tenta reportar via adminapi (diagnóstico).
    const api = await ping();
    return NextResponse.json({ ok: false, source: "informix", message: db.message, apiStatus: api.status, info: uccxInfo });
  }
  const status = await ping();
  return NextResponse.json({ ...status, source: "adminapi", info: uccxInfo });
}

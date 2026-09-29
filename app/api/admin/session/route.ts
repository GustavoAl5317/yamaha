import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminEnabled, isAdmin, tokenForPassword } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Estado da sessão do admin.
export async function GET() {
  return NextResponse.json({ enabled: adminEnabled(), authenticated: isAdmin() });
}

// Login.
export async function POST(req: Request) {
  if (!adminEnabled()) {
    return NextResponse.json({ ok: false, error: "Admin desativado: defina ADMIN_PASSWORD no .env.local" }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const token = tokenForPassword(String(body?.password ?? ""));
  if (!token) return NextResponse.json({ ok: false, error: "Senha incorreta" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}

// Logout.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

import crypto from "node:crypto";
import { cookies } from "next/headers";

/**
 * Autenticação do painel admin: senha única em ADMIN_PASSWORD (.env.local).
 * Sem ADMIN_PASSWORD definido, o admin fica desligado.
 * Protege o acesso interno; não substitui login por usuário.
 */

export const ADMIN_COOKIE = "yd_admin";

export function adminEnabled(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

/** Token derivado da senha: muda junto com ela, invalidando as sessões antigas. */
function expectedToken(): string {
  return crypto.createHash("sha256").update(`yamaha-dash:${process.env.ADMIN_PASSWORD}`).digest("hex");
}

export function tokenForPassword(password: string): string | null {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return null;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return expectedToken();
}

export function isAdmin(): boolean {
  if (!adminEnabled()) return false;
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expectedToken());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

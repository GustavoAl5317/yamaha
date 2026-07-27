export const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : n.toLocaleString("pt-BR");

export function mmss(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return "—";
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

/** invert=false: quanto maior, pior. Retorna 'ok' | 'warn' | 'crit'. */
export function stateFor(v: number | null | undefined, warn: number, crit: number): string {
  if (v === null || v === undefined) return "";
  return v <= warn ? "ok" : v <= crit ? "warn" : "crit";
}

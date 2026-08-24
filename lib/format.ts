export const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : n.toLocaleString("pt-BR");

export function mmss(sec: number | null | undefined): string {
  if (sec === null || sec === undefined) return "—";
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

/**
 * Padroniza a exibição de nomes vindos do AD (que chegam em caixa alta,
 * caixa baixa ou misturados) para "Nome Sobrenome", com preposições em minúsculo.
 */
const LOWER = new Set(["da", "de", "di", "do", "das", "dos", "e"]);
export function titleCase(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .trim()
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/)
    .map((w, i) =>
      i > 0 && LOWER.has(w) ? w : w.charAt(0).toLocaleUpperCase("pt-BR") + w.slice(1),
    )
    .join(" ");
}

/** invert=false: quanto maior, pior. Retorna 'ok' | 'warn' | 'crit'. */
export function stateFor(v: number | null | undefined, warn: number, crit: number): string {
  if (v === null || v === undefined) return "";
  return v <= warn ? "ok" : v <= crit ? "warn" : "crit";
}

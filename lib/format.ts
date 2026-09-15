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

/** Formata o número de origem: ramal curto, (DD) XXXXX-XXXX, ou o valor cru se não reconhecer. */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "Não identificado";
  let d = raw.replace(/\D/g, "");
  if (d.length === 0) return raw;
  if (d.length <= 6) return `Ramal ${d}`;
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);   // DDI Brasil
  if (d.length >= 11 && d.startsWith("0")) d = d.slice(1);    // prefixo de tronco
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

/** Horário (HH:MM, Brasília) de um datetime do banco, que vem em GMT "YYYY-MM-DD HH:MM:SS.fff". */
export function hhmmFromDb(dbDatetime: string): string {
  const t = new Date(dbDatetime.trim().replace(" ", "T") + "Z");
  if (Number.isNaN(t.getTime())) return "—";
  return t.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

/** invert=false: quanto maior, pior. Retorna 'ok' | 'warn' | 'crit'. */
export function stateFor(v: number | null | undefined, warn: number, crit: number): string {
  if (v === null || v === undefined) return "";
  return v <= warn ? "ok" : v <= crit ? "warn" : "crit";
}

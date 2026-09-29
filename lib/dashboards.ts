import fs from "node:fs";
import path from "node:path";
import { DEFAULT_BLOCKS, type DashboardBlocks } from "./dashboard-blocks";

/**
 * Cadastro dos dashboards liberados para clientes.
 * Guardado em arquivo JSON no servidor (poucos registros, escrita rara).
 * O Help Desk é o padrão: serve de modelo para os novos.
 */

export type { DashboardBlocks } from "./dashboard-blocks";
export { DEFAULT_BLOCKS } from "./dashboard-blocks";

export interface DashboardCfg {
  slug: string;      // usado na URL: /dashboard/<slug>
  title: string;     // título no topo do painel
  csqId: string;     // fila (contactservicequeueid)
  csqName: string;
  enabled: boolean;  // desligado = link fora do ar
  blocks: DashboardBlocks;
  createdAt: string;
}

const FILE = path.join(process.cwd(), "data", "dashboards.json");

/** Padrão: Help Desk, o painel que serve de modelo. */
const SEED: DashboardCfg[] = [
  {
    slug: "help-desk",
    title: "Fila Help Desk",
    csqId: "93",
    csqName: "Help_Desk_csq",
    enabled: true,
    blocks: { ...DEFAULT_BLOCKS },
    createdAt: new Date().toISOString(),
  },
];

function readAll(): DashboardCfg[] {
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    const list = JSON.parse(raw);
    if (Array.isArray(list) && list.length > 0) return list;
  } catch { /* arquivo ainda não existe */ }
  writeAll(SEED);
  return SEED;
}

function writeAll(list: DashboardCfg[]): void {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2), "utf8");
}

export function listDashboards(): DashboardCfg[] {
  return readAll();
}

export function getDashboard(slug: string): DashboardCfg | null {
  return readAll().find((d) => d.slug === slug) ?? null;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Cria um dashboard. Gera slug único a partir do título. */
export function createDashboard(input: {
  title: string; csqId: string; csqName: string; blocks?: Partial<DashboardBlocks>;
}): DashboardCfg {
  const list = readAll();
  const base = slugify(input.title) || "painel";
  let slug = base;
  for (let i = 2; list.some((d) => d.slug === slug); i++) slug = `${base}-${i}`;

  const cfg: DashboardCfg = {
    slug,
    title: input.title.trim(),
    csqId: String(input.csqId),
    csqName: input.csqName,
    enabled: true,
    blocks: { ...DEFAULT_BLOCKS, ...(input.blocks ?? {}) },
    createdAt: new Date().toISOString(),
  };
  writeAll([...list, cfg]);
  return cfg;
}

/** Atualiza título, fila, blocos ou liberação. O slug não muda, para não quebrar o link. */
export function updateDashboard(
  slug: string,
  patch: Partial<Pick<DashboardCfg, "title" | "csqId" | "csqName" | "enabled">> & { blocks?: Partial<DashboardBlocks> },
): DashboardCfg | null {
  const list = readAll();
  const i = list.findIndex((d) => d.slug === slug);
  if (i < 0) return null;
  const cur = list[i];
  list[i] = {
    ...cur,
    ...("title" in patch && patch.title ? { title: patch.title.trim() } : {}),
    ...("csqId" in patch && patch.csqId ? { csqId: String(patch.csqId) } : {}),
    ...("csqName" in patch && patch.csqName ? { csqName: patch.csqName } : {}),
    ...("enabled" in patch && patch.enabled != null ? { enabled: patch.enabled } : {}),
    blocks: { ...cur.blocks, ...(patch.blocks ?? {}) },
  };
  writeAll(list);
  return list[i];
}

export function deleteDashboard(slug: string): boolean {
  const list = readAll();
  const rest = list.filter((d) => d.slug !== slug);
  if (rest.length === list.length) return false;
  writeAll(rest);
  return true;
}

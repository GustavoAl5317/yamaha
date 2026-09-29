/**
 * Tipos dos blocos do painel.
 * Fica separado de lib/dashboards.ts porque aquele arquivo lê disco (node:fs)
 * e este é importado também pelo componente que roda no navegador.
 */

export interface DashboardBlocks {
  kpis: boolean;          // cards de Recebidas/Atendidas/... no topo
  monthCurrent: boolean;  // gráfico do mês atual
  monthPrevious: boolean; // gráfico do mês anterior
  agentsTable: boolean;   // tabela de atendentes
  abandoned: boolean;     // bloco com os números que abandonaram
  agentsDonut: boolean;   // rosca "Agentes agora"
}

/** Rótulos usados no painel admin, na ordem em que aparecem no dashboard. */
export const BLOCK_LABELS: { key: keyof DashboardBlocks; label: string }[] = [
  { key: "kpis", label: "Indicadores do dia" },
  { key: "monthCurrent", label: "Gráfico do mês atual" },
  { key: "monthPrevious", label: "Gráfico do mês anterior" },
  { key: "agentsTable", label: "Tabela de atendentes" },
  { key: "abandoned", label: "Números que abandonaram" },
  { key: "agentsDonut", label: "Agentes agora (rosca)" },
];

export const DEFAULT_BLOCKS: DashboardBlocks = {
  kpis: true,
  monthCurrent: true,
  monthPrevious: true,
  agentsTable: true,
  abandoned: true,
  agentsDonut: true,
};

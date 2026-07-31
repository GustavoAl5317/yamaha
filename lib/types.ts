export interface QueueConfig {
  id: string;
  name: string;
  queueType: string;
  algorithm: string;
  serviceLevelSec: number;
  serviceLevelPct: number;
  skill: string | null;
}

export interface QueueRealtime {
  available: boolean;          // false quando a fonte não entrega número (ex.: -1)
  reason?: string;             // motivo quando indisponível
  callsWaiting: number | null;
  longestWaitSec: number | null;
  agentsLogged: number | null;
  agentsReady: number | null;
  agentsTalking: number | null;
  agentsNotReady: number | null;
  ts: number;
}

export interface AgentConfig {
  id: string;
  firstName: string;
  lastName: string;
  extension: string | null;
  team: string | null;
  state: string | null;
}

export interface ConnStatus {
  ok: boolean;
  status: number;
  host: string;
  message: string;
}

// KPIs acumulados do dia (fonte: contactqueuedetail/contactcalldetail — reais)
export interface QueueKpis {
  received: number;    // contatos que entraram na fila
  answered: number;    // atendidas (disposition=2)
  abandoned: number;   // abandonadas (disposition=1)
  slPct: number;       // % dentro do nível de serviço
  avgWaitSec: number;  // TME
  avgHandleSec: number | null; // TMA
}

// Volume por hora do dia (fonte: contactqueuedetail) — para o gráfico temporal
export interface HourPoint {
  hour: string;       // "13"
  received: number;
  answered: number;
  abandoned: number;
}

// Resposta unificada de "tempo real" do painel
export interface QueueLive {
  source: "informix" | "finesse" | "none";
  ts: number;
  kpis: QueueKpis | null;      // histórico do dia (disponível agora)
  instant: QueueRealtime;      // snapshot instantâneo (RtCSQsSummary)
}

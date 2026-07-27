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
}

export interface ConnStatus {
  ok: boolean;
  status: number;
  host: string;
  message: string;
}

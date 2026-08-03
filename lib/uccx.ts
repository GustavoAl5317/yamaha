import https from "node:https";
import { XMLParser } from "fast-xml-parser";
import type { QueueConfig, QueueRealtime, AgentConfig, ConnStatus } from "./types";

const HOST = process.env.UCCX_HOST || "uccx01.ind.intcloud.com.br";
const ADMIN_PORT = Number(process.env.UCCX_ADMIN_PORT || 443);
const FINESSE_PORT = Number(process.env.UCCX_FINESSE_PORT || 8445);
const ADMIN_USER = process.env.UCCX_ADMIN_USER || "";
const ADMIN_PASS = process.env.UCCX_ADMIN_PASS || "";
const SUP_USER = process.env.UCCX_SUP_USER || "";
const SUP_PASS = process.env.UCCX_SUP_PASS || "";
const FINESSE_TEAM_ID = process.env.FINESSE_TEAM_ID || "17";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

// Aceita o certificado self-signed do UCCX (ambiente interno controlado).
const agent = new https.Agent({ rejectUnauthorized: false });

interface HttpResult {
  status: number;
  body: string;
}

function httpGet(port: number, path: string, user: string, pass: string, timeoutMs = 12000): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    // Permite contornar bugs de parsing de senha passando o base64 direto pelo env
    const overrideB64 = process.env.UCCX_AUTH_B64;
    const auth = overrideB64 ? "Basic " + overrideB64 : "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
    
    const req = https.request(
      { host: HOST, port, path, method: "GET", agent, headers: { Authorization: auth, Accept: "application/xml" } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode || 0, body: data }));
      },
    );
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error("timeout")));
    req.end();
  });
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

/** Testa a conectividade/autenticação com a adminapi. */
export async function ping(): Promise<ConnStatus> {
  try {
    const r = await httpGet(ADMIN_PORT, "/adminapi/csq", ADMIN_USER, ADMIN_PASS);
    let message = "Conectado";
    if (r.status === 401) message = "401 — credencial recusada (conta pode estar bloqueada ou senha alterada)";
    else if (r.status >= 500) message = `Erro no servidor (${r.status})`;
    else if (r.status !== 200) message = `HTTP ${r.status}`;
    return { ok: r.status === 200, status: r.status, host: HOST, message };
  } catch (e: any) {
    return { ok: false, status: 0, host: HOST, message: `Sem conexão: ${e?.message || e}. Verifique a VPN.` };
  }
}

/** Lista todas as filas (CSQs) configuradas — identifica o que existe. */
export async function getQueues(): Promise<QueueConfig[]> {
  const r = await httpGet(ADMIN_PORT, "/adminapi/csq", ADMIN_USER, ADMIN_PASS);
  if (r.status !== 200) throw new UccxError(r.status, "adminapi/csq");
  const j = parser.parse(r.body);
  return asArray<any>(j?.csqs?.csq).map(mapQueue);
}

/** Config de uma fila específica. Retorna null se não existir. */
export async function getQueue(id: string): Promise<QueueConfig | null> {
  const r = await httpGet(ADMIN_PORT, `/adminapi/csq/${encodeURIComponent(id)}`, ADMIN_USER, ADMIN_PASS);
  if (r.status === 404) return null;
  if (r.status !== 200) throw new UccxError(r.status, `adminapi/csq/${id}`);
  const j = parser.parse(r.body);
  const csq = j?.csq;
  return csq ? mapQueue(csq) : null;
}

function mapQueue(csq: any): QueueConfig {
  const pair = csq?.poolSpecificInfo?.skillGroup?.skillCompetency?.skillNameUriPair;
  const skill = Array.isArray(pair) ? pair[0]?.["@_name"] : pair?.["@_name"];
  return {
    id: String(csq.id),
    name: String(csq.name),
    queueType: String(csq.queueType ?? ""),
    algorithm: String(csq.queueAlgorithm ?? ""),
    serviceLevelSec: Number(csq.serviceLevel ?? 0),
    serviceLevelPct: Number(csq.serviceLevelPercentage ?? 0),
    skill: skill ?? null,
  };
}

/**
 * Dados em tempo real da fila via Finesse. SEM simulação:
 * se a fonte devolver -1 (sem supervisor/Live Data), marca available=false.
 */
export async function getQueueRealtime(id: string): Promise<QueueRealtime> {
  const useSup = Boolean(SUP_USER && SUP_PASS);
  const user = useSup ? SUP_USER : ADMIN_USER;
  const pass = useSup ? SUP_PASS : ADMIN_PASS;

  const empty = (reason: string): QueueRealtime => ({
    available: false, reason,
    callsWaiting: null, longestWaitSec: null,
    agentsLogged: null, agentsReady: null, agentsTalking: null, agentsNotReady: null,
    ts: Date.now(),
  });

  let r: HttpResult;
  try {
    r = await httpGet(FINESSE_PORT, `/finesse/api/Queue/${encodeURIComponent(id)}`, user, pass);
  } catch (e: any) {
    return empty(`Sem conexão com o Finesse: ${e?.message || e}`);
  }
  if (r.status === 401) return empty("401 no Finesse — credencial recusada.");
  if (r.status === 404) return empty("Fila não encontrada no Finesse.");
  if (r.status !== 200) return empty(`Finesse HTTP ${r.status}`);

  const j = parser.parse(r.body);
  const s = j?.Queue?.statistics;
  if (!s) return empty("Resposta do Finesse sem estatísticas.");

  const num = (v: any) => (v === undefined || v === null || Number(v) === -1 ? null : Number(v));
  const calls = num(s.callsInQueue);
  const logged = num(s.agentsLoggedOn);

  // Se tudo veio -1, não há dado em tempo real disponível para este usuário.
  if (calls === null && logged === null) {
    return empty("Fonte de tempo real não disponível para este usuário (sem supervisor/Live Data).");
  }

  const talking =
    (num(s.agentsTalkingInbound) ?? 0) +
    (num(s.agentsTalkingOutbound) ?? 0) +
    (num(s.agentsTalkingInternal) ?? 0);

  let longest: number | null = null;
  if (s.startTimeOfLongestCallInQueue) {
    const t = Date.parse(String(s.startTimeOfLongestCallInQueue));
    if (!Number.isNaN(t)) longest = Math.max(0, Math.round((Date.now() - t) / 1000));
  }

  return {
    available: true,
    callsWaiting: calls,
    longestWaitSec: longest,
    agentsLogged: logged,
    agentsReady: num(s.agentsReady),
    agentsTalking: talking,
    agentsNotReady: num(s.agentsNotReady),
    ts: Date.now(),
  };
}

/**
 * Lista de agentes do time via Finesse.
 * Endpoint indicado pela equipe: GET /finesse/api/Team/{team_id}
 * (T maiúsculo obrigatório).
 */
export async function getAgents(teamId?: string): Promise<AgentConfig[]> {
  const tid = teamId || FINESSE_TEAM_ID;
  const useSup = Boolean(SUP_USER && SUP_PASS);
  const user = useSup ? SUP_USER : ADMIN_USER;
  const pass = useSup ? SUP_PASS : ADMIN_PASS;

  const r = await httpGet(FINESSE_PORT, `/finesse/api/Team/${encodeURIComponent(tid)}`, user, pass);
  if (r.status !== 200) throw new UccxError(r.status, `finesse/api/Team/${tid}`);

function translateReason(r: string | null): string | null {
  if (!r) return null;
  const lower = r.toLowerCase();
  if (lower.includes("agent initiated")) return "Ação do agente";
  if (lower.includes("connection failure")) return "Falha de conexão";
  if (lower.includes("system initiated")) return "Ação do sistema";
  if (lower.includes("end of shift")) return "Fim do turno";
  if (lower.includes("device reset")) return "Dispositivo reiniciado";
  return r;
}

  const j = parser.parse(r.body);
  return asArray<any>(j?.Team?.users?.User).map((a) => {
    let reason = null;
    if (a.reasonCode) {
      reason = String(a.reasonCode.label || a.reasonCode.code || a.reasonCode || "");
      if (reason === "[object Object]" || !reason) reason = null;
    }
    return {
      id: String(a.loginId ?? ""),
      firstName: String(a.firstName ?? ""),
      lastName: String(a.lastName ?? ""),
      extension: a.extension ? String(a.extension) : null,
      team: a.teamName ? String(a.teamName) : null,
      state: translateState(a.state),
      reason: translateReason(reason),
    };
  });
}

export class UccxError extends Error {
  status: number;
  resource: string;
  constructor(status: number, resource: string) {
    super(`UCCX ${resource} retornou HTTP ${status}`);
    this.status = status;
    this.resource = resource;
  }
}

function translateState(state: string | undefined | null): string | null {
  if (!state) return null;
  switch (String(state).toUpperCase()) {
    case "NOT_READY": return "Indisponível";
    case "READY": return "Disponível";
    case "TALKING": return "Em Atendimento";
    case "WORK":
    case "WORK_READY": return "Em Trabalho";
    case "LOGOUT": return "Desconectado";
    case "LOGIN": return "Conectando";
    default: return String(state);
  }
}

export const uccxInfo = { host: HOST, adminPort: ADMIN_PORT, finessePort: FINESSE_PORT, hasSupervisor: Boolean(SUP_USER && SUP_PASS) };

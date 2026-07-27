import type { QueueConfig, QueueRealtime, QueueKpis, QueueLive, HourPoint } from "./types";

/**
 * Fonte de dados real: banco Informix db_cra do UCCX.
 * - Lista de filas: contactservicequeue (substitui o adminapi).
 * - KPIs do dia: contactqueuedetail + contactcalldetail (dado histórico, disponível agora).
 * - Instantâneo: RtCSQsSummary (só preenche quando o "Real-Time Snapshot" está ligado no UCCX).
 *
 * O driver `informixdb` é nativo (roda no intc01/Linux). require preguiçoso: se não carregar,
 * as funções retornam vazio/indisponível e o caller cai no fallback.
 */

const E = process.env;

function connString(useSub = false) {
  const host = useSub ? E.INFORMIX_HOST2 : E.INFORMIX_HOST;
  const server = useSub ? E.INFORMIX_SERVER2 : E.INFORMIX_SERVER;
  const loc = E.INFORMIX_LOCALE || "en_US.utf8";
  return (
    `SERVER=${server};DATABASE=${E.INFORMIX_DB};HOST=${host};SERVICE=${E.INFORMIX_PORT};` +
    `UID=${E.INFORMIX_USER};PWD=${E.INFORMIX_PASS};PROTOCOL=onsoctcp;` +
    `DB_LOCALE=${loc};CLIENT_LOCALE=${loc};`
  );
}

export function informixConfigured(): boolean {
  return Boolean(E.INFORMIX_HOST && E.INFORMIX_DB && E.INFORMIX_USER && E.INFORMIX_PASS);
}

function loadDriver(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("informixdb");
  } catch (e: any) {
    console.error("[informix] falha ao carregar o driver:", e?.message);
    return null;
  }
}

function open(ibmdb: any): Promise<any> {
  return new Promise((resolve, reject) => {
    ibmdb.open(connString(false), { connectTimeout: 12 }, (err: any, conn: any) => {
      if (!err) return resolve(conn);
      ibmdb.open(connString(true), { connectTimeout: 12 }, (err2: any, conn2: any) =>
        err2 ? reject(err2) : resolve(conn2));
    });
  });
}

function query(conn: any, sql: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    conn.query(sql, (err: any, rows: any[]) => (err ? reject(err) : resolve(rows)));
  });
}

const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Lista de filas ativas direto do banco (não depende do adminapi). */
export async function listQueues(): Promise<QueueConfig[]> {
  const ibmdb = loadDriver();
  if (!ibmdb) return [];
  let conn: any;
  try {
    conn = await open(ibmdb);
  } catch {
    return [];
  }
  try {
    const rows = await query(
      conn,
      `SELECT contactservicequeueid id, csqname name, servicelevel sl,
              servicelevelpercentage pct, queuealgorithm alg, queuetypename qtype
         FROM contactservicequeue WHERE active = 't' ORDER BY csqname`,
    );
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      queueType: String(r.qtype ?? ""),
      algorithm: String(r.alg ?? ""),
      serviceLevelSec: num(r.sl),
      serviceLevelPct: num(r.pct),
      skill: null,
    }));
  } catch {
    return [];
  } finally {
    try { conn?.closeSync(); } catch { /* noop */ }
  }
}

// ---- Instantâneo (RtCSQsSummary) — mapeamento por aliases ----
function pick(row: Record<string, any>, keys: string[]): number | null {
  const low: Record<string, any> = {};
  for (const k of Object.keys(row)) low[k.toLowerCase()] = row[k];
  for (const k of keys) {
    if (k in low && low[k] != null) {
      const v = Number(low[k]);
      if (Number.isFinite(v)) return v;
    }
  }
  return null;
}
function pickStr(row: Record<string, any>, keys: string[]): string | null {
  const low: Record<string, any> = {};
  for (const k of Object.keys(row)) low[k.toLowerCase()] = row[k];
  for (const k of keys) if (k in low && low[k] != null) return String(low[k]).trim();
  return null;
}

const emptyInstant = (reason: string): QueueRealtime => ({
  available: false, reason,
  callsWaiting: null, longestWaitSec: null,
  agentsLogged: null, agentsReady: null, agentsTalking: null, agentsNotReady: null,
  ts: Date.now(),
});

/** Snapshot instantâneo da fila (RtCSQsSummary). available=false se a tabela estiver vazia. */
async function instantSnapshot(conn: any, csqName: string): Promise<QueueRealtime> {
  let rows: any[];
  try {
    rows = await query(conn, "SELECT * FROM RtCSQsSummary");
  } catch (e: any) {
    return emptyInstant(`Erro na RtCSQsSummary: ${String(e?.message || e).split("\n")[0]}`);
  }
  if (!rows || rows.length === 0) {
    return emptyInstant("Snapshot em tempo real desligado no UCCX (RtCSQsSummary vazia).");
  }
  const target = csqName.toLowerCase();
  const row = rows.find((r) => (pickStr(r, ["csqname"]) || "").toLowerCase() === target);
  if (!row) return emptyInstant(`Fila '${csqName}' não está na RtCSQsSummary.`);
  return {
    available: true,
    callsWaiting: pick(row, ["callswaiting"]),
    longestWaitSec: pick(row, ["oldestcontact", "longestwaitduration"]),
    agentsLogged: pick(row, ["loggedinagents"]),
    agentsReady: pick(row, ["availableagents"]),
    agentsTalking: pick(row, ["talkingagents"]),
    agentsNotReady: pick(row, ["unavailableagents"]),
    ts: Date.now(),
  };
}

/** KPIs acumulados do dia para uma fila (contactqueuedetail + contactcalldetail). */
async function kpisToday(conn: any, csqId: number): Promise<QueueKpis | null> {
  const base =
    `FROM contactqueuedetail cqd, contactservicequeue csq
      WHERE cqd.targetid = csq.recordid AND cqd.targettype = 0
        AND csq.contactservicequeueid = ${csqId}
        AND cqd.startdatetime >= TODAY`;
  let q1: any[];
  try {
    q1 = await query(
      conn,
      `SELECT
         COUNT(*) received,
         SUM(CASE WHEN cqd.disposition = 2 THEN 1 ELSE 0 END) answered,
         SUM(CASE WHEN cqd.disposition = 1 THEN 1 ELSE 0 END) abandoned,
         SUM(CASE WHEN cqd.metservicelevel THEN 1 ELSE 0 END) metsl,
         AVG(cqd.queuetime) avgwait
       ${base}`,
    );
  } catch {
    return null;
  }
  const r = q1?.[0] || {};
  const received = num(r.received);

  // TMA — tempo médio de conversa das atendidas (contactcalldetail.connecttime)
  let avgHandleSec: number | null = null;
  try {
    const q2 = await query(
      conn,
      `SELECT AVG(ccd.connecttime) avgtalk
         FROM contactcalldetail ccd, contactqueuedetail cqd, contactservicequeue csq
        WHERE ccd.sessionid = cqd.sessionid AND ccd.sessionseqnum = cqd.sessionseqnum
          AND cqd.targetid = csq.recordid AND cqd.targettype = 0
          AND csq.contactservicequeueid = ${csqId}
          AND cqd.disposition = 2 AND cqd.startdatetime >= TODAY`,
    );
    const v = q2?.[0]?.avgtalk;
    if (v != null) avgHandleSec = Math.round(Number(v));
  } catch { /* opcional */ }

  return {
    received,
    answered: num(r.answered),
    abandoned: num(r.abandoned),
    slPct: received > 0 ? Math.round((num(r.metsl) / received) * 100) : 0,
    avgWaitSec: Math.round(num(r.avgwait)),
    avgHandleSec,
  };
}

/**
 * Estado ATUAL dos agentes de uma fila, ao vivo, direto do banco.
 * Cadeia: contactservicequeue → skillgroup → resourceskillmapping → resource
 *         → agentstatedetailsnapshot (último evento por agente = estado atual).
 * eventtype: 1=Login 2=NotReady 3=Ready 4=Reserved 5=Talking 6=Work 7=Logout.
 */
async function agentsLive(
  conn: any,
  csqId: number,
): Promise<{ logged: number; ready: number; talking: number; notReady: number } | null> {
  try {
    const rows = await query(
      conn,
      `SELECT snap.eventtype et, COUNT(DISTINCT snap.agentid) qtd
         FROM agentstatedetailsnapshot snap
        WHERE snap.eventdatetime = (
                SELECT MAX(s2.eventdatetime) FROM agentstatedetailsnapshot s2
                 WHERE s2.agentid = snap.agentid)
          AND snap.agentid IN (
                SELECT r.resourceid
                  FROM resource r, resourceskillmapping rsm, skillgroup sg, contactservicequeue csq
                 WHERE r.resourceskillmapid = rsm.resourceskillmapid AND rsm.active = 't'
                   AND rsm.skillid = sg.skillid AND sg.active = 't'
                   AND sg.skillgroupid = csq.skillgroupid AND csq.active = 't'
                   AND csq.contactservicequeueid = ${csqId} AND r.active = 't')
        GROUP BY snap.eventtype`,
    );
    if (!rows) return null;
    const m: Record<number, number> = {};
    for (const r of rows) m[Number(r.et)] = Number(r.qtd);
    const g = (k: number) => m[k] || 0;
    return {
      logged: g(1) + g(2) + g(3) + g(4) + g(5) + g(6), // tudo menos Logout(7)
      ready: g(3),
      talking: g(4) + g(5),   // Reserved + Talking
      notReady: g(2) + g(6),  // NotReady + Work(wrapup)
    };
  } catch (e: any) {
    console.error("[informix] agentsLive:", e?.message);
    return null;
  }
}

/** Retorna KPIs do dia + instantâneo (agentes do banco + fila do RtCSQsSummary). */
export async function getLive(csqId: string, csqName: string): Promise<QueueLive> {
  const ibmdb = loadDriver();
  const none: QueueLive = { source: "none", ts: Date.now(), kpis: null, instant: emptyInstant("Driver Informix indisponível neste ambiente.") };
  if (!ibmdb) return none;

  let conn: any;
  try {
    conn = await open(ibmdb);
  } catch (e: any) {
    return { source: "none", ts: Date.now(), kpis: null, instant: emptyInstant(`Sem conexão ao banco: ${String(e?.message || e).split("\n")[0]}`) };
  }
  try {
    const [kpis, snap, agents] = await Promise.all([
      kpisToday(conn, Number(csqId)),
      instantSnapshot(conn, csqName),
      agentsLive(conn, Number(csqId)),
    ]);
    // Agentes vêm do banco (ao vivo). Fila em espera vem do RtCSQsSummary (null se snapshot desligado).
    const instant: QueueRealtime = {
      available: agents != null || snap.available,
      reason: agents != null ? undefined : snap.reason,
      callsWaiting: snap.callsWaiting,
      longestWaitSec: snap.longestWaitSec,
      agentsLogged: agents ? agents.logged : snap.agentsLogged,
      agentsReady: agents ? agents.ready : snap.agentsReady,
      agentsTalking: agents ? agents.talking : snap.agentsTalking,
      agentsNotReady: agents ? agents.notReady : snap.agentsNotReady,
      ts: Date.now(),
    };
    return { source: "informix", ts: Date.now(), kpis, instant };
  } finally {
    try { conn?.closeSync(); } catch { /* noop */ }
  }
}

/** Testa a conexão real com o banco db_cra (usado pelo status de conexão). */
export async function pingInformix(): Promise<{ ok: boolean; message: string }> {
  const ibmdb = loadDriver();
  if (!ibmdb) return { ok: false, message: "Driver Informix indisponível neste ambiente" };
  let conn: any;
  try {
    conn = await open(ibmdb);
  } catch (e: any) {
    return { ok: false, message: `Sem conexão ao banco: ${String(e?.message || e).split("\n")[0]}` };
  }
  try {
    await query(conn, "SELECT FIRST 1 CURRENT FROM systables");
    return { ok: true, message: "Banco db_cra conectado" };
  } catch (e: any) {
    return { ok: false, message: String(e?.message || e).split("\n")[0] };
  } finally {
    try { conn?.closeSync(); } catch { /* noop */ }
  }
}

/** Volume por hora do dia para o gráfico temporal (dado histórico real). */
export async function getHourly(csqId: string): Promise<HourPoint[]> {
  const ibmdb = loadDriver();
  if (!ibmdb) return [];
  let conn: any;
  try {
    conn = await open(ibmdb);
  } catch {
    return [];
  }
  try {
    const rows = await query(
      conn,
      `SELECT TO_CHAR(cqd.startdatetime, '%H') hora,
              COUNT(*) received,
              SUM(CASE WHEN cqd.disposition = 2 THEN 1 ELSE 0 END) answered,
              SUM(CASE WHEN cqd.disposition = 1 THEN 1 ELSE 0 END) abandoned
         FROM contactqueuedetail cqd, contactservicequeue csq
        WHERE cqd.targetid = csq.recordid AND cqd.targettype = 0
          AND csq.contactservicequeueid = ${Number(csqId)}
          AND cqd.startdatetime >= TODAY
        GROUP BY 1 ORDER BY 1`,
    );
    return (rows || []).map((r) => ({
      hour: String(r.hora),
      received: num(r.received),
      answered: num(r.answered),
      abandoned: num(r.abandoned),
    }));
  } catch (e: any) {
    console.error("[informix] getHourly:", e?.message);
    return [];
  } finally {
    try { conn?.closeSync(); } catch { /* noop */ }
  }
}

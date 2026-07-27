import type { QueueRealtime } from "./types";

/**
 * Conexão com o banco Informix db_cra do UCCX (fonte real de tempo real).
 * O driver `informixdb` é nativo e só carrega onde foi compilado (ex.: intc01/Linux).
 * Por isso o require é preguiçoso e tolerante: se não carregar, retorna null e o
 * caller cai no fallback (Finesse).
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
  } catch {
    return null; // driver nativo indisponível neste ambiente
  }
}

function open(ibmdb: any): Promise<any> {
  return new Promise((resolve, reject) => {
    ibmdb.open(connString(false), { connectTimeout: 12 }, (err: any, conn: any) => {
      if (!err) return resolve(conn);
      // tenta subscriber
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

// ---- Mapeamento defensivo de colunas (nomes variam por versão do UCCX) ----
function pick(row: Record<string, any>, aliases: string[]): number | null {
  const low: Record<string, any> = {};
  for (const k of Object.keys(row)) low[k.toLowerCase()] = row[k];
  for (const a of aliases) {
    if (a in low) {
      const v = Number(low[a]);
      if (!Number.isNaN(v)) return v;
    }
  }
  return null;
}
function pickStr(row: Record<string, any>, aliases: string[]): string | null {
  const low: Record<string, any> = {};
  for (const k of Object.keys(row)) low[k.toLowerCase()] = row[k];
  for (const a of aliases) if (a in low && low[a] != null) return String(low[a]).trim();
  return null;
}

const A = {
  name: ["csqname", "csqid", "name"],
  waiting: ["callswaiting", "contactswaiting", "contactsqueued", "queuedcontacts", "contactswaitinginqueue"],
  longest: ["oldestcontact", "oldestcontactinqueue", "longestcontactinqueue", "longestcallinqueue", "oldestinqueue"],
  logged: ["agentsloggedin", "loggedinagents", "agentslogged", "totalagents"],
  ready: ["availableagents", "agentsavailable", "readyagents", "agentsready"],
  talking: ["talkingagents", "agentstalking"],
  notready: ["notreadyagents", "agentsnotready", "unavailableagents"],
};

/**
 * Lê o snapshot em tempo real de uma fila a partir da RtCSQsSummary.
 * Retorna null se o driver não carregar; QueueRealtime com available=false
 * se a tabela existir porém sem a fila / sem dados.
 */
export async function getSnapshotByName(csqName: string): Promise<QueueRealtime | null> {
  const ibmdb = loadDriver();
  if (!ibmdb) return null;

  let conn: any;
  const empty = (reason: string): QueueRealtime => ({
    available: false, reason,
    callsWaiting: null, longestWaitSec: null,
    agentsLogged: null, agentsReady: null, agentsTalking: null, agentsNotReady: null,
    ts: Date.now(),
  });

  try {
    conn = await open(ibmdb);
  } catch (e: any) {
    return empty(`Sem conexão ao Informix: ${String(e?.message || e).split("\n")[0]}`);
  }

  try {
    const rows: any[] = await query(conn, "SELECT * FROM RtCSQsSummary");
    if (!rows || rows.length === 0) {
      return empty("RtCSQsSummary vazia — habilitar 'Real-Time Snapshot Writing' no UCCX.");
    }
    const target = String(csqName).toLowerCase();
    const row = rows.find((r) => (pickStr(r, A.name) || "").toLowerCase() === target) || null;
    if (!row) return empty(`Fila '${csqName}' não encontrada na RtCSQsSummary.`);

    return {
      available: true,
      callsWaiting: pick(row, A.waiting),
      longestWaitSec: pick(row, A.longest),
      agentsLogged: pick(row, A.logged),
      agentsReady: pick(row, A.ready),
      agentsTalking: pick(row, A.talking),
      agentsNotReady: pick(row, A.notready),
      ts: Date.now(),
    };
  } catch (e: any) {
    return empty(`Erro ao consultar RtCSQsSummary: ${String(e?.message || e).split("\n")[0]}`);
  } finally {
    try { conn?.closeSync(); } catch { /* noop */ }
  }
}

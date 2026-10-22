/* =====================================================================
 * probe-reason.js — descobre como traduzir o código de pausa do agente
 * ---------------------------------------------------------------------
 * Rode no intc01:
 *     node scripts/probe-reason.js
 * Mostra as tabelas com "reason" no nome, as colunas de cada uma, uma
 * amostra de linhas e os códigos que estão em uso agora no snapshot.
 * ===================================================================== */
const fs = require("fs");
const path = require("path");

(function loadEnv() {
  const p = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
})();

// O driver nativo só carrega com INFORMIXDIR e LD_LIBRARY_PATH apontando para as .so
// (é o que o ecosystem.config.js faz no PM2). Fora do PM2, o script se reconfigura e
// roda de novo em um processo filho com as variáveis certas.
(function bootstrapDriver() {
  if (process.env.YD_PROBE_CHILD) return;
  const root = path.join(__dirname, "..", "node_modules/informixdb/installer/onedb-odbc-driver");
  if (!fs.existsSync(root)) return;

  const dirs = new Set();
  (function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.so(\.|$)/.test(e.name)) dirs.add(dir);
    }
  })(root);

  const env = { ...process.env, YD_PROBE_CHILD: "1", INFORMIXDIR: root };
  env.LD_LIBRARY_PATH = [...dirs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":");

  const r = require("child_process").spawnSync(process.execPath, [__filename], { env, stdio: "inherit" });
  process.exit(r.status ?? 1);
})();

let ibmdb;
try { ibmdb = require("informixdb"); }
catch (e) { console.error("Driver informixdb indisponível:", e.message); process.exit(2); }

const E = process.env;
const nodes = [
  { host: E.INFORMIX_HOST, server: E.INFORMIX_SERVER, label: "PUBLISHER" },
  { host: E.INFORMIX_HOST2, server: E.INFORMIX_SERVER2, label: "SUBSCRIBER" },
].filter((n) => n.host && n.server);
const locales = [E.INFORMIX_LOCALE || "en_US.utf8", "en_US.819", ""];

function cs(node, locale) {
  return `SERVER=${node.server};DATABASE=${E.INFORMIX_DB};HOST=${node.host};SERVICE=${E.INFORMIX_PORT};` +
    `UID=${E.INFORMIX_USER};PWD=${E.INFORMIX_PASS};PROTOCOL=onsoctcp;` +
    (locale ? `DB_LOCALE=${locale};CLIENT_LOCALE=${locale};` : "");
}

function connect() {
  return new Promise(async (resolve, reject) => {
    for (const node of nodes) {
      for (const loc of locales) {
        const r = await new Promise((res) =>
          ibmdb.open(cs(node, loc), { connectTimeout: 12 }, (err, conn) =>
            res(err ? { err } : { conn })));
        if (r.conn) { console.log(`Conectado em ${node.label} (${node.host})\n`); return resolve(r.conn); }
      }
    }
    reject(new Error("Não conectou em nenhum nó."));
  });
}

const q = (conn, sql) => new Promise((res) =>
  conn.query(sql, (err, rows) => res(err ? { err: String(err.message || err).split("\n")[0] } : { rows })));

async function section(conn, title, sql) {
  console.log(`\n########## ${title} ##########`);
  const r = await q(conn, sql);
  if (r.err) { console.log("  ERRO:", r.err); return null; }
  console.log(JSON.stringify(r.rows, null, 2));
  return r.rows;
}

(async () => {
  let conn;
  try { conn = await connect(); } catch (e) { console.error(e.message); process.exit(1); }

  const tabs = await section(conn, "TABELAS COM 'REASON' NO NOME",
    `SELECT tabname FROM systables WHERE tabid > 99 AND lower(tabname) LIKE '%reason%' ORDER BY tabname`);

  for (const t of tabs || []) {
    const name = String(t.tabname).trim();
    await section(conn, `COLUNAS DE ${name}`,
      `SELECT c.colname FROM syscolumns c, systables t
        WHERE c.tabid = t.tabid AND t.tabname = '${name}' ORDER BY c.colno`);
    await section(conn, `AMOSTRA DE ${name}`, `SELECT FIRST 10 * FROM ${name}`);
  }

  await section(conn, "CÓDIGOS EM USO NO SNAPSHOT",
    `SELECT FIRST 20 snap.agentid, snap.eventtype, snap.reasoncode
       FROM agentstatedetailsnapshot snap
      WHERE snap.eventdatetime = (
            SELECT MAX(s2.eventdatetime) FROM agentstatedetailsnapshot s2
             WHERE s2.agentid = snap.agentid)`);

  try { conn.closeSync(); } catch { /* noop */ }
})();

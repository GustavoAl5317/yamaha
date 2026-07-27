/* =====================================================================
 * db-explore.js — Diagnóstico do banco Informix db_cra (UCCX Yamaha)
 * ---------------------------------------------------------------------
 * Rode ISTO PRIMEIRO no intc01 (Linux):
 *     node scripts/db-explore.js
 * Ele conecta e revela o schema real (tabelas + colunas + amostras) pra
 * a gente finalizar as queries do coletor com precisão.
 * Requer: VPN/rota até o UCCX + pacote informixdb instalado.
 * ===================================================================== */
const fs = require("fs");
const path = require("path");

// -- carrega .env.local manualmente (scripts não passam pelo Next) --
(function loadEnv() {
  const p = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
})();

let ibmdb;
try { ibmdb = require("informixdb"); }
catch (e) { console.error("Instale o driver primeiro: npm install informixdb\n", e.message); process.exit(2); }

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
            res(err ? { err } : { conn, node, loc })));
        if (r.conn) { console.log(`Conectado em ${node.label} (${node.host}) locale=${loc || "nenhum"}\n`); return resolve(r.conn); }
        console.log(`  ✗ ${node.label} locale=${loc || "nenhum"}: ${String(r.err.message || r.err).split("\n")[0]}`);
      }
    }
    reject(new Error("Não conectou em nenhum nó."));
  });
}

const q = (conn, sql) => new Promise((res) => conn.query(sql, (err, rows) => res(err ? { err: String(err.message || err).split("\n")[0] } : { rows })));

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

  await section(conn, "VERSÃO", "SELECT FIRST 1 dbinfo('version','full') AS versao FROM systables");

  const tabs = await section(conn, "TABELAS RELEVANTES",
    `SELECT tabname FROM systables
       WHERE tabid > 99
         AND (lower(tabname) LIKE 'rt%' OR lower(tabname) LIKE 'contact%'
              OR lower(tabname) LIKE '%csq%' OR lower(tabname) LIKE 'agent%'
              OR lower(tabname) LIKE '%servicequeue%' OR lower(tabname) LIKE 'resource%')
       ORDER BY tabname`);

  // Introspecta as tabelas-chave para o coletor
  const alvo = ["RtCSQsSummary", "RtICDStatistics", "ContactServiceQueue", "ContactCallDetail", "ContactQueueDetail", "csqnamemap"];
  for (const t of alvo) {
    await section(conn, `COLUNAS de ${t}`,
      `SELECT c.colno, c.colname, c.coltype FROM syscolumns c
         JOIN systables s ON c.tabid = s.tabid
        WHERE lower(s.tabname) = lower('${t}') ORDER BY c.colno`);
  }

  // Amostra da tabela de tempo real (a mais importante)
  await section(conn, "AMOSTRA RtCSQsSummary (tempo real)", "SELECT FIRST 20 * FROM RtCSQsSummary");
  await section(conn, "CONTAGEM RtCSQsSummary", "SELECT COUNT(*) AS linhas FROM RtCSQsSummary");

  conn.closeSync();
  console.log("\n=== Fim da exploração. Cole esta saída aqui que eu finalizo as queries do coletor. ===");
})();

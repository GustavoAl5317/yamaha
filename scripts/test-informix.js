/* Teste rápido de conexão ao Informix db_cra (UCCX Yamaha).
 * Uso: node scripts/test-informix.js
 * Lê as credenciais do .env.local (NUNCA hardcode senha aqui).
 * Requer VPN/rota até o UCCX + pacote informixdb instalado.
 */
const fs = require("fs");
const path = require("path");

// carrega .env.local
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
catch (e) { console.error("Driver 'informixdb' não instalado:", e.message); process.exit(2); }

const E = process.env;
const NODES = [
  { label: "PUBLISHER", host: E.INFORMIX_HOST, server: E.INFORMIX_SERVER },
  { label: "SUBSCRIBER", host: E.INFORMIX_HOST2, server: E.INFORMIX_SERVER2 },
].filter((n) => n.host && n.server);

const LOCALES = [E.INFORMIX_LOCALE || "en_US.utf8", "en_US.819", ""];

function connString(node, locale) {
  return (
    `SERVER=${node.server};DATABASE=${E.INFORMIX_DB};HOST=${node.host};SERVICE=${E.INFORMIX_PORT};` +
    `UID=${E.INFORMIX_USER};PWD=${E.INFORMIX_PASS};PROTOCOL=onsoctcp;` +
    (locale ? `DB_LOCALE=${locale};CLIENT_LOCALE=${locale};` : "")
  );
}

function tryConn(cs) {
  return new Promise((resolve) => {
    ibmdb.open(cs, { connectTimeout: 12 }, (err, conn) => {
      if (err) return resolve({ ok: false, err: String(err.message || err).split("\n")[0] });
      conn.query("SELECT FIRST 1 CURRENT AS agora FROM systables", (qerr, rows) => {
        const out = qerr ? { ok: false, err: String(qerr.message || qerr).split("\n")[0] } : { ok: true, rows };
        conn.closeSync();
        resolve(out);
      });
    });
  });
}

(async () => {
  if (!NODES.length) { console.error("Configure INFORMIX_* no .env.local"); process.exit(2); }
  for (const node of NODES) {
    console.log(`\n=== ${node.label} (${node.host}) ===`);
    let done = false;
    for (const loc of LOCALES) {
      const r = await tryConn(connString(node, loc));
      if (r.ok) {
        console.log(`  ✅ CONECTOU  (locale: ${loc || "nenhum"})`);
        console.log("  Query OK:", JSON.stringify(r.rows));
        done = true;
        break;
      }
      console.log(`  ✗ falhou (locale ${loc || "nenhum"}): ${r.err}`);
    }
    if (done) break;
  }
  console.log("\nFim do teste.");
})();

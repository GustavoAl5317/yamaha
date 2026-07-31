import fs from "node:fs";
const env = fs.readFileSync(".env.local", "utf8");
env.split("\n").forEach(line => {
  line = line.replace(/\r$/, ""); // remove \r do Windows
  if (line && !line.startsWith("#") && line.includes("=")) {
    const idx = line.indexOf("=");
    const key = line.substring(0, idx).trim();
    const val = line.substring(idx + 1).trim();
    process.env[key] = val;
  }
});

// Debug: verificar se as credenciais foram carregadas
const user = process.env.UCCX_SUP_USER || process.env.UCCX_ADMIN_USER || "";
const pass = process.env.UCCX_SUP_PASS || process.env.UCCX_ADMIN_PASS || "";
console.log(`User: "${user}"`);
console.log(`Pass: "${pass.substring(0, 3)}***${pass.substring(pass.length - 3)}" (${pass.length} chars)`);
console.log(`Team ID: ${process.env.FINESSE_TEAM_ID}`);
console.log(`Finesse port: ${process.env.UCCX_FINESSE_PORT}`);
console.log(`Host: ${process.env.UCCX_HOST}`);
console.log("");

import https from "node:https";
import { XMLParser } from "fast-xml-parser";

const HOST = process.env.UCCX_HOST || "uccx01.ind.intcloud.com.br";
const PORT = Number(process.env.UCCX_FINESSE_PORT || 8445);
const TEAM_ID = process.env.FINESSE_TEAM_ID || "17";

const agent = new https.Agent({ rejectUnauthorized: false });

function httpGet(path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const auth = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
    console.log(`→ GET https://${HOST}:${PORT}${path}`);
    console.log(`  Auth header (first 20): ${auth.substring(0, 26)}...`);
    const req = https.request(
      { host: HOST, port: PORT, path, method: "GET", agent, headers: { Authorization: auth, Accept: "application/xml" } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode || 0, body: data }));
      },
    );
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("timeout")));
    req.end();
  });
}

async function main() {
  console.log("=== Teste direto da API Finesse Team ===\n");

  // Teste 1: endpoint do Team
  try {
    const r = await httpGet(`/finesse/api/Team/${TEAM_ID}`);
    console.log(`\nStatus: ${r.status}`);
    if (r.status === 200) {
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
      const j = parser.parse(r.body);
      const users = j?.Team?.users?.User;
      const arr = Array.isArray(users) ? users : users ? [users] : [];
      console.log(`\n✅ ${arr.length} agente(s) no time ${TEAM_ID}:\n`);
      arr.forEach((a: any) => {
        console.log(`  ${a.firstName} ${a.lastName} | ramal: ${a.extension || "—"} | estado: ${a.state || "—"}`);
      });
    } else {
      console.log(`\n❌ HTTP ${r.status}`);
      console.log("Body (primeiros 500 chars):", r.body.substring(0, 500));
    }
  } catch (e) {
    console.error("❌ Erro de conexão:", e);
  }
}

main();

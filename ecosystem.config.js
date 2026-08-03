// Configuração do PM2 — inclui as variáveis de ambiente do driver Informix
// (LD_LIBRARY_PATH / INFORMIXDIR), que o "pm2 start npm ..." puro não seta.
const fs = require("fs");
const path = require("path");

const driverRoot = path.join(__dirname, "node_modules/informixdb/installer/onedb-odbc-driver");

function findLibDirs(root) {
  const dirs = new Set();
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.so(\.|$)/.test(e.name)) dirs.add(dir);
    }
  }
  walk(root);
  return Array.from(dirs);
}

const libDirs = fs.existsSync(driverRoot) ? findLibDirs(driverRoot) : [];
const ldLibraryPath = libDirs.join(":") + (process.env.LD_LIBRARY_PATH ? ":" + process.env.LD_LIBRARY_PATH : "");

module.exports = {
  apps: [
    {
      name: "yamaha-dash",
      script: "npm",
      args: "run start -- -H 0.0.0.0",
      cwd: __dirname,
      env: {
        INFORMIXDIR: driverRoot,
        LD_LIBRARY_PATH: ldLibraryPath,
      },
    },
  ],
};

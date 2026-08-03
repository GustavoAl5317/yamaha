const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Lê as variáveis do .env.local nativamente para dentro do PM2
const envLocalPath = path.resolve(__dirname, '.env.local');
const envConfig = {};

if (fs.existsSync(envLocalPath)) {
  const envFile = fs.readFileSync(envLocalPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let key = match[1];
      let value = match[2] || '';
      // Remove aspas se existirem
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      envConfig[key] = value.trim();
    }
  });
}

// 2. Resolve dinamicamente as bibliotecas C++ do banco Informix (mesma lógica do start.sh)
const informixDir = path.resolve(__dirname, 'node_modules/informixdb/installer/onedb-odbc-driver');
let ldLibraryPath = process.env.LD_LIBRARY_PATH || '';

if (fs.existsSync(informixDir)) {
  try {
    const findCmd = `find "${informixDir}" -name '*.so*' -printf '%h\n' | sort -u | tr '\n' ':'`;
    const paths = execSync(findCmd, { encoding: 'utf8' });
    ldLibraryPath = paths + ldLibraryPath;
    envConfig['INFORMIXDIR'] = informixDir;
  } catch (e) {
    console.error("Erro ao buscar bibliotecas do Informix", e);
  }
}

// 3. Inicia o PM2 ligando direto no núcleo do Node (sem bash intermediário)
module.exports = {
  apps: [
    {
      name: 'yamaha-dash',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 0.0.0.0 -p 3000',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        LD_LIBRARY_PATH: ldLibraryPath,
        ...envConfig
      }
    }
  ]
};

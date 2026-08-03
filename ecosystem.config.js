const fs = require('fs');
const path = require('path');

const envLocalPath = path.resolve(__dirname, '.env.local');
const envConfig = {};

if (fs.existsSync(envLocalPath)) {
  const envFile = fs.readFileSync(envLocalPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      envConfig[key] = value;
    }
  });
}

module.exports = {
  apps: [
    {
      name: 'yamaha-dash',
      script: 'bash',
      args: 'start.sh prod',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        ...envConfig
      }
    }
  ]
};

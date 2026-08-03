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
        PORT: 3000
      }
    }
  ]
};

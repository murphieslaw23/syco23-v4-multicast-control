module.exports = {
  apps: [{
    name: 'syco23-multicast-control',
    script: './node_modules/.bin/tsx',
    args: 'app/server/runtime-server.ts',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
    kill_timeout: 12000,
    listen_timeout: 10000,
    env: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: '3000',
      SYCO_DB_PATH: './data/syco23.sqlite',
    },
  }],
}

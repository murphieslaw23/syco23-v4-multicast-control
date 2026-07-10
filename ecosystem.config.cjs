module.exports = {
  apps: [
    {
      name: 'syco23-multicast-control-preview',
      script: 'npm',
      args: 'run preview -- --host 0.0.0.0 --port 4173',
      env: {
        NODE_ENV: 'production',
      },
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
}

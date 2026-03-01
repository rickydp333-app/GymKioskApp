module.exports = {
  apps: [
    {
      name: 'gymkiosk-server',
      script: 'server.js',
      cwd: '.',
      autorestart: true,
      watch: false,
      max_restarts: 20,
      restart_delay: 3000,
      min_uptime: '20s'
    },
    {
      name: 'gymkiosk-kiosk',
      script: 'node_modules/electron/cli.js',
      args: '.',
      cwd: '.',
      autorestart: true,
      watch: false,
      max_restarts: 20,
      restart_delay: 4000,
      min_uptime: '20s',
      env: {
        ELECTRON_DISABLE_SECURITY_WARNINGS: 'true'
      }
    }
  ]
};

module.exports = {
  apps: [
    {
      name: "npc_photosync",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3005",
      cwd: "/var/www/npc_photosync",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3005,
      },
    },
  ],
};

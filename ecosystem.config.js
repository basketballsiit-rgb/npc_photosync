module.exports = {
  apps: [
    {
      name: "npc_photosync",
      script: "npm",
      args: "start",
      cwd: "/var/www/npc_photosync",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3006,
        NEXT_PUBLIC_BASE_PATH: "/npc_photosync",
      },
    },
  ],
};

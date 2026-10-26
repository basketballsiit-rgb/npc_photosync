const fs = require("fs");

// Check for NVM Node 20 path on college server
const nvmNode = "/root/.nvm/versions/node/v20.20.2/bin/node";
const interpreter = fs.existsSync(nvmNode) ? nvmNode : "node";

module.exports = {
  apps: [
    {
      name: "npc_photosync",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3006",
      cwd: "/var/www/npc_photosync",
      interpreter: interpreter,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: "3006",
        NEXT_PUBLIC_BASE_PATH: "/npc_photosync",
      },
    },
  ],
};

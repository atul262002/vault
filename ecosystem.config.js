module.exports = {
  apps: [
    {
      name: "vault",
      cwd: "/root/atul/vault-main/vault",
      script: "/root/.nvm/versions/node/v22.21.1/bin/npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "scheduler",
      cwd: "/root/atul/vault-main/vault",
      script: "scheduler.js",
      env: {
        NODE_ENV: "production",
        // API_URL: "http://localhost:3000/api/cron/reminders" // Optional override
      }
    }
  ]
};


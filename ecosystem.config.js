module.exports = {
  apps: [
    {
      name: "vault",
      cwd: "/root/atul/vault-main/vault-main",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "scheduler",
      cwd: "/root/atul/vault-main/vault-main",
      script: "scheduler.js",
      env: {
        NODE_ENV: "production",
        // API_URL: "http://localhost:3000/api/cron/reminders" // Optional override
      }
    }
  ]
};


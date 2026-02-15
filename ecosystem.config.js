module.exports = {
  apps: [
    {
      name: "vault",
      cwd: "/root/atul/vault-main/vault",
      script: "node",
      args: ".next/standalone/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "scheduler",
      cwd: "/root/atul/vault-main/vault",
      script: "node",
      args: "scheduler.js",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};

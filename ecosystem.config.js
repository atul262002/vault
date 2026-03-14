module.exports = {
  apps: [
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

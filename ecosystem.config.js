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
    }
  ]
};


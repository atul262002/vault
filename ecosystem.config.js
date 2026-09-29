// PM2 process file. Start with: pm2 start ecosystem.config.js
//
// Both apps run an explicit JavaScript file with the node interpreter. Never
// start the app with `pm2 start npm -- start`: PM2 resolves a file named
// `npm` in the working directory before the real npm, so anything dropped
// there under that name would be executed.
module.exports = {
  apps: [
    {
      name: "vault",
      cwd: __dirname,
      script: ".next/standalone/server.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
    {
      name: "scheduler",
      cwd: __dirname,
      script: "scheduler.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

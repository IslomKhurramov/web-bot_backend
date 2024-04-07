module.exports = {
  apps: [
    {
      name: "web-bot",
      cwd: "./",
      script: "./index.js",
      watch: true,
      env_production: {
        NODE_ENV: "production",
      },
      instances: 1,
      exec_mode: "cluster",
    },
  ],
};

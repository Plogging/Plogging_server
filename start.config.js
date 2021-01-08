module.exports = {
    apps : [
        {
          name: "plogging server",
          script: "./index.js",
          watch: true,
          out_file: "/dev/null",
          error_file: "/dev/null",
          env: {
              "NODE_ENV": "development"
          },
          env_production: {
            "NODE_ENV": "production"
          }
        }
    ]
  }
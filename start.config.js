module.exports = {
    apps : [
        {
          name: "plogging server",
          script: "./index.js",
          watch: false,
          out_file: "/dev/null",
          error_file: "/dev/null",
	        instances: 2,
          exec_mode: "cluster",
          env: { // 로컬
              "NODE_ENV": "local",
              "PORT": 20000,
              "LOG_LEVEL": "debug",
              "MONGODB_INFO": "127.0.0.1:27017", 
              "MONGODB_PASSWORD": "JjaoSaoP+IRVDBkXdDR4XMgTmkMut0VM",
              "REDIS_INFO": "127.0.0.1:6379", 
              "REDIS_PASSWORD":"JjaoSaoP+IRVDBkXdDR4XMgTmkMut0VM",
              "MARIADB_INFO": "127.0.0.1:3306",
              "MARIADB_PASSWORD": "JjaoSaoP+IRVDBkXdDR4XMgTmkMut0VM",
              "IMG_FILE_PATH": "/mnt/Plogging_server/images",
              "ADMIN_EMAIL_ID": "ploggingteam@gmail.com",
              "ADMIN_EMAIL_PASSWORD": "IVUVhpHmNGoYLZpy4Ate5OKNH/6hlziQ",
              "SERVER_REQ_INFO": "http:127.0.0.1:20000",
              "LOG_PATH": "/mnt/Plogging_server/images/log"
          },
          env_development: { // tb ( 라즈베리파이 서버 )
            "NODE_ENV": "development",
            "PORT": 8000, 
            "MONGODB_INFO": "192.168.0.25:27017",
            "MONGODB_PASSWORD": "JjaoSaoP+IRVDBkXdDR4XMgTmkMut0VM",
            "REDIS_INFO": "192.168.0.25:6379",
            "REDIS_PASSWORD":"JjaoSaoP+IRVDBkXdDR4XMgTmkMut0VM",
            "MARIADB_INFO": "192.168.0.25:3306",
            "MARIADB_PASSWORD": "JjaoSaoP+IRVDBkXdDR4XMgTmkMut0VM",
            "IMG_FILE_PATH": "/mnt/Plogging_server/images",
            "SERVER_REQ_INFO": "http://121.130.220.217:30000",
            "ADMIN_EMAIL_ID": "ploggingteam@gmail.com",
            "ADMIN_EMAIL_PASSWORD": "IVUVhpHmNGoYLZpy4Ate5OKNH/6hlziQ",
            "LOG_PATH": "/mnt/Plogging_server/images/log"
          },
          env_production: { // 상용
            "NODE_ENV": "production",
            "PORT": 8000, 
            "MONGODB_INFO": "192.168.0.9:27017",
            "MONGODB_PASSWORD": "JjaoSaoP+IRVDBkXdDR4XMgTmkMut0VM",
            "REDIS_INFO": "192.168.0.9:6379",
            "REDIS_PASSWORD":"JjaoSaoP+IRVDBkXdDR4XMgTmkMut0VM",
            "MARIADB_INFO": "192.168.0.9:3306",
            "MARIADB_PASSWORD": "JjaoSaoP+IRVDBkXdDR4XMgTmkMut0VM",
            "IMG_FILE_PATH": "/mnt/Plogging_server/images",
            "SERVER_REQ_INFO": "https:nexters.plogging.kro.kr:20000",
            "ADMIN_EMAIL_ID": "ploggingteam@gmail.com",
            "ADMIN_EMAIL_PASSWORD": "IVUVhpHmNGoYLZpy4Ate5OKNH/6hlziQ",
            "LOG_PATH": "/mnt/Plogging_server/images/log"
          }
        }
    ]
  }

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
              "IMG_FILE_PATH": "E:file_test",
              "ADMIN_EMAIL_ID": "ploggingteam@gmail.com",
              "ADMIN_EMAIL_PASSWORD": "1/KvPFPwoNiXJhstP/+J7xF4Jrvh0X2t",
              "SERVER_REQ_INFO": "http:127.0.0.1:20000",
              "LOG_PATH": "E:\winston-log"
          },
          env_development: { // tb ( 라즈베리파이 서버 )
            "NODE_ENV": "development",
            "PORT": 443, // https
            "MONGODB_INFO": "172.17.0.1:27017",
            "MONGODB_PASSWORD": "JjaoSaoP+IRVDBkXdDR4XMgTmkMut0VM",
            "REDIS_INFO": "172.17.0.1:6379",
            "REDIS_PASSWORD":"JjaoSaoP+IRVDBkXdDR4XMgTmkMut0VM",
            "MARIADB_INFO": "172.17.0.1:3306",
            "MARIADB_PASSWORD": "JjaoSaoP+IRVDBkXdDR4XMgTmkMut0VM",
            "IMG_FILE_PATH": "/mnt/Plogging_server/images",
            "SERVER_REQ_INFO": "https:nexters.plogging.kro.kr:20000",
            "ADMIN_EMAIL_ID": "ploggingteam@gmail.com",
            "ADMIN_EMAIL_PASSWORD": "1/KvPFPwoNiXJhstP/+J7xF4Jrvh0X2t",
            "LOG_PATH": "/mnt/Plogging_server/images/log"
          },
          env_production: { // 상용 ( 클라우드 서버 )
            "NODE_ENV": "production",
          }
        }
    ]
  }

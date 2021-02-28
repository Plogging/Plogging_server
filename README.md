# Plogging_server

 
## [사용언어/프레임워크]
 - nodejs, express, sequelize

## [사용 데이터베이스]
 - mariadb, mongodb, redis

## [ 서비스 Flow ]
![image](https://user-images.githubusercontent.com/21052356/109422538-4c714a80-7a1f-11eb-86f6-18051eea5ad9.png)


## [ 프로젝트 구조 ]
![폴더 구조](https://user-images.githubusercontent.com/21052356/109422575-7c205280-7a1f-11eb-9447-ecab64b999ef.png)
 - config : 설정 파일 ( 디비..기타 등등 )
 - public : 정적 파일 저장 위치
 - router : api 선언부
 - controller : api 구현부
 - model : db access 구현부
 - util : 공통 모듈 파일
 - index.js 실행파일
 
 
 ## .gitignore 파일
   - config 설정정보 파일, node_modules 라이브러리들은 깃에 안올리고 로컬에서 관리 !
 ```
 ## config 파일 제외
config/

## 라이브러리 파일 제외
node_modules

## exclude img files
images/

## 기타 파일 제외
.vscode
package-lock.json

 ```
  
 ## cluster mode
   - instance 여러개 띄움 ( 2개 )
   - start.config.js
   ```
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
            "ADMIN_EMAIL_PASSWORD": "IVUVhpHmNGoYLZpy4Ate5OKNH/6hlziQ",
            "LOG_PATH": "/mnt/Plogging_server/images/log"
          },
          env_production: { // 상용 ( 클라우드 서버 )
            "NODE_ENV": "production",
          }
        }
    ]
  }

   ```
   ![pm2 cluster mode](https://user-images.githubusercontent.com/21052356/104002938-18c73080-51e5-11eb-9181-1f2dbb707038.PNG)
   

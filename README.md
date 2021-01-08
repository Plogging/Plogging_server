# Plogging_server

  
## [ 서비스 Flow ]
![flow](https://user-images.githubusercontent.com/21052356/103457479-14ad9580-4d43-11eb-936f-8c0bba829500.png)



## [ 프로젝트 구조 ]
![프로젝트 구조](https://user-images.githubusercontent.com/21052356/103457470-fd6ea800-4d42-11eb-9e07-c97f030cdb91.PNG)
 - config : 설정 파일 ( 디비..기타 등등 )
 - public : 정적 파일 저장 위치
 - router : api 로직 구현부 ( index.js에서 url에 맞게 포워딩 - /user, /trash )
 - util : 공통 모듈 파일
 - index.js 실행파일
 
 
 ## .gitignore 파일
   - config 설정정보 파일, node_modules 라이브러리들은 깃에 안올리고 로컬에서 관리 !
 ```
  ## config 파일 제외 
  ./config

  ## 라이브러리 파일 제외
  ./node_modules

 ```
 
 ## 실행 방법
  - package.json 파일이 의존성 관리 파일
  - npm install  ( package.json에 있는 의존성 불러와서 로컬에 설치될거에요. )


 ## fork mode
  - instance 1개 띄움
  - start.config.js
  ```
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
  ```
  ![pm2 fork mode](https://user-images.githubusercontent.com/21052356/104002925-14027c80-51e5-11eb-9abe-2e3d41287111.PNG)
  
 ## cluster mode
   - instance 여러개 띄움 ( 3개 )
   - start.config.cluster.json
   ```
   {
    "apps": [
      {
        "name": "plogging server cluster",
        "script": "./index.js",
        "watch": true,
        "out_file": "/dev/null",
        "error_file": "/dev/null",
        "instances": 3,
        "exec_mode": "cluster",
        "env": {
          "NODE_ENV": "production"
        }
      }
    ]
  } 
   ```
   ![pm2 cluster mode](https://user-images.githubusercontent.com/21052356/104002938-18c73080-51e5-11eb-9181-1f2dbb707038.PNG)
   
  
  

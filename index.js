const express = require('express');
const fs = require('fs');
const { CustomError, Unauthorized } = require('throw.js')

const userRoutes = require('./routers/user.js');
const rankingRoutes = require('./routers/ranking')
const ploggingRoutes = require('./routers/plogging');
const bodyParser = require('body-parser');
const redisClient = require('./config/redisConfig.js');
const MongoClient = require('./config/mongoConfig.js');
const swaggerValidation = require('./util/validator.js');
const {sequelize} = require('./models/index');
const logger = require("./util/logger.js")("index.js");
const session = require('express-session');
const redisStore = require('connect-redis')(session);
const YAML = require('yamljs');

const http = require('http');
const https = require('https');
const sslOptions = {
    key: fs.readFileSync('./sslFiles/privkey1.pem'),
    cert: fs.readFileSync('./sslFiles/cert1.pem')
};

// node-swagger
const swaggerUi = require('swagger-ui-express');

(async () => {
    const swaggerDocument = YAML.load('./swagger.yaml');
    await MongoClient.connect();

    const app = express();
    sequelize.sync({alter: true}).then(()=>{
        logger.info("success create database");
    }).catch((err) => {
        logger.error("fail create database");
        logger.error(err.stack);
    });


    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());
    app.use(express.static(process.env.IMG_FILE_PATH)); // 정적파일 제공
    // redis sessionStorage 설정
    app.use(session({
        store : new redisStore({ // default는 메모리에 저장
            client: redisClient
        }),
        secret: 'plogging', // sessionId를 만들때 key로 쓰이는거 같음
        resave: false,
        saveUninitialized: false
        /**
         * 쿠키값 설정 
         *  cookie: {
         *      httpOnly: true, -> defualt가 true임. true로하면 js코드로 cookie값 접근안되고, 클라가 header에서 쿠키 받을 수 있음. false로 주면
         *      클라에서 쿠키에 있는 세션id를 못 받으므로 true로 줘야함
         *      secure: false -> default가 false 임 -> true로 바꾸게되면 https에서만 쿠키값 가져올 수 있음
         *  }
         */
    }));

    // 전역 설정
    const globalOption = {};
    globalOption.PORT = process.env.PORT;
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument)); // node-swaggwer
    app.use("/", function(req, res, next) {
        logger.info(JSON.stringify(req.headers));
        logger.info(`req.session.id : ${req.sessionID}`);
        // 세션 체크 공통 모듈
        if((req.path === '/user' && req.method === 'POST') ||
            (req.path === '/user/password-temp') ||
            (req.path === '/user/sign-in') ||
            (req.path === '/user/social') ||
            (req.path === '/user/check')) next();
        else {
            if(req.session.userId) {  // 세션 값이 있는 경우 ( 로그인이 되어있는 경우 )
                req.userId = req.session.userId;
                next();
            } else { // 세션 값이 없는 경우 ( 로그인이 안되어 있는 경우 )
                throw new Unauthorized("로그인 후 서비스를 이용해 주세요");
            }
        }
    });
    
    app.use('/user', userRoutes);
    app.use('/rank', rankingRoutes); // 랭킹 관련 api는 ranking.js로 포워딩
    app.use('/plogging',ploggingRoutes); // 산책이력 관련 api는 plogging.js로 포워딩        

    // 예외 처리
    // 반드시 라우팅 코드 이후에 위치해야 함
    app.use((err, req, res, next) => {

        logger.error(JSON.stringify({"errorMsg": err.stack}));
        
        if (err instanceof swaggerValidation.InputValidationError) {
            return res.status(400).json({rc: 400, rcmsg: err.errors.join(', ')})
        } else if (err instanceof CustomError) {
            return res.status(err.statusCode)
            .json({rc: err.statusCode, rcmsg: err.message})
        } else {
            if (process.env.NODE_ENV == "production") {
                return res.status(500).json({rc: 500, rcmsg: "Internal error"})
            } else {
                return res.status(500).json({rc: 500, rcmsg: err.message})
            }
        }
    })

    if(process.env.NODE_ENV === 'local') {
        http.createServer(app).listen(globalOption.PORT, function(req, res){
            console.log(`server on ${globalOption.PORT} !`);
        })
    } else if(process.env.NODE_ENV === 'development') {
        https.createServer(sslOptions, app).listen(globalOption.PORT, function(req, res){
            console.log(`server on ${globalOption.PORT} !`);
        })
    }
})();


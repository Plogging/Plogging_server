const express = require('express');
const { CustomError } = require('throw.js')

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

// node-swagger
const swaggerUi = require('swagger-ui-express');

(async () => {
    const swaggerDocument = YAML.load('./swagger.yaml');
    await MongoClient.connect();

    const app = express();
    sequelize.sync();

    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());

    app.use(express.static(process.env.IMG_FILE_PATH)); // 정적파일 제공

    // redis sessionStorage 설정
    app.use(session({
        store : new redisStore({ // default는 메모리에 저장
            client: redisClient,
            ttl: 60*30 // expires ( per in second ) - 30분
        }),
        secret: 'plogging', // sessionId를 만들때 key로 쓰이는거 같음
        resave: false,
        saveUninitialized: true,
    }));

    // 전역 설정
    const globalOption = {};
    globalOption.PORT = process.env.PORT;
   
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument)); // node-swaggwer

    /**
    * step 1. userId가 파라미터로 들어왔는지 확인 ( req.query.userId )
    * step 2. 
    *    2-1. 파라미터로 안들어왔다면 redis에서 조회한 값으로 userId 세팅 ( 산책이력 조회, 산책이력 등록, 산책이력 삭제 )
    *    2-2. 파라미터로 들어왔다면 파리미터로 들어온 값으로 userId 세팅 ( 산책이력 조회 ) 
    * 
    */
    app.use("/", function(req, res, next) {

        // 세션 체크 공통 모듈
        if((req.path === '/user' && req.method === 'POST') || 
            (req.path === '/user/password-temp') || 
            (req.path === '/user/sign-in') ||
            (req.path === '/user/social') ||
            (req.path === '/user/check')) next();
        else {
            const sessionKey = req.get('sessionKey');
            if(sessionKey === req.session.id) {  // 세션 값이 있는 경우 ( 로그인이 되어있는 경우 )
                req.userId = req.session.userId;
                next();
            } else { // 세션 값이 없는 경우 ( 로그인이 안되어 있는 경우 )
                res.sendStatus(401);
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
            return res.status(400).send(err.errors.join(', '))
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

    app.listen(globalOption.PORT, function(req, res) {
        console.log(`server on ${globalOption.PORT} !`);
    })
})();

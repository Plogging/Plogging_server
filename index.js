const express = require('express');
const app = express();

const UserInferface = require("./router/user.js");
const TrashInferface = require('./router/trash.js');
const RankingInterface = require('./router/ranking.js');
const bodyParser = require('body-parser');
const poolCallback = require("./config/mysqlConfig.js").getMysqlPool; // callback
const poolAsyncAwait = require("./config/mysqlConfig.js").getMysqlPool2; // async await
const redisCilent = require("./config/redisConfig.js");
const MongoClient = require("./config/mongoConfig.js");

const session = require('express-session');
const redisStore = require('connect-redis')(session);

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// redis sessionStorage 설정
app.use(session({
    store : new redisStore({ // default는 메모리에 저장
        client: redisCilent,
        ttl: 60*30 // expires ( per in second ) - 30분
    }),
    secret: "Flogging", // sessionId를 만들때 key로 쓰이는거 같음
    resave: false,
    saveUninitialized: true,
}));

// 전역 설정
const globalOption = {};
globalOption.PORT = 20000;
globalOption.mysqlPool=poolCallback;
globalOption.mysqlPool2=poolAsyncAwait;
globalOption.redisCilent=redisCilent;

// 이 로직은 아래 /user, /trash를 타기전에 탄다. spring insterceptor 개념이라고 보면됨 ( 여기서 api들어가기전에 먼저 처리해야될 로직 있으면 처리.. ex. 유저 세션체크..)
/*
app.use("/", function(req, res, next) {
    // 세션 체크 공통 모듈
    console.log("인터셉터 !");

    if(req.path === '/user/login' || req.path === '/user/logout') next();
    else 
        if(req.session.userId === "xowns9418") {  // 세션 값이 있는 경우
            next();
        } else { // 세션 값이 없는 경우
            res.send("로그인 후 서비스를 사용해 주세요.");
        }
    } 
 );
 */

app.use('/user', new UserInferface(globalOption)); // 유저 관려 api는 user.js로 포워딩
app.use('/rank', new RankingInterface(globalOption)); // 랭킹 관련 api는 ranking.js로 포워딩

async function main( ) {
    try {
        await MongoClient.connect();
        let db = MongoClient.db('test');
        globalOption.MongoClient=db;
        app.use('/trash', new TrashInferface(globalOption)); // 쓰레기 관련 api는 trash.js로 포워딩        
    } catch(e) {
        console.log(e);
    } 
}

main().catch(console.error);

app.listen(globalOption.PORT, function(req, res) {
    console.log(`server on ${globalOption.PORT} !`);
})
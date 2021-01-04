const express = require('express');
const app = express();

const UserInferface = require("./router/user.js");
const TrashInferface = require('./router/trash.js');
const bodyParser = require('body-parser');
const poolCallback = require("./config/mysqlConfig.js").getMysqlPool; // callback
const poolAsyncAwait = require("./config/mysqlConfig.js").getMysqlPool2; // async await
//const redisCilent = require("./config/redisConfig.js");

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// 전역 설정
const globalOption = {};
globalOption.PORT = 20000;
globalOption.mysqlPool=poolCallback;
globalOption.mysqlPool2=poolAsyncAwait;
//globalOption.redisCilent=redisCilent;

// 이 로직은 아래 /user, /trash를 타기전에 탄다. spring insterceptor 개념이라고 보면됨 ( 여기서 api들어가기전에 먼저 처리해야될 로직 있으면 처리.. ex. 유저 세션체크..)
app.use(function(req, res, next) {
    // 세션 체크 공통 모듈
    console.log("인터셉터 !");
    next();
 });

app.use('/user', new UserInferface(globalOption)); // 유저 관려 api는 user.js로 포워딩
app.use('/trash', new TrashInferface(globalOption)); // 쓰레기 관련 api는 trash.js로 포워딩

app.listen(globalOption.PORT, function(req, res) {
    console.log(`server on ${globalOption.PORT} !`);
})
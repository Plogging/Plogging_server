const express = require('express');
const app = express();

const UserInferface = require("./router/user.js");
const TrashInferface = require('./router/trash.js');
const bodyParser = require('body-parser');
const poolCallback = require("../config/mysqlConfig").getMysqlPool; // callback
const poolAsyncAwait = require("../config/mysqlConfig").getMysqlPool2; // async await
const redisCilent = require("../config/redisConfig");

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// 전역 설정
const globalOption = {};
globalOption.PORT = 20000;
globalOption.mysqlPool=poolCallback;
globalOption.mysqlPool2=poolAsyncAwait;
globalOption.redisCilent=redisCilent;

app.use('/user', new UserInferface(globalOption)); // 유저 관려 api는 user.js로 포워딩
app.use('/trash', new TrashInferface(globalOption)); // 쓰레기 관련 api는 trash.js로 포워딩

app.listen(globalOption.PORT, function(req, res) {
    console.log(`server on ${globalOption.PORT} !`);
})
const express = require('express');
const cors=require('cors');

const TrashInferface = function(config) {
    const router = express.Router();
    router.all('*',cors());

    this.router = router;
    this.mysqlPool = config.mysqlPool;
    this.mysqlPool2 = config.mysqlPool2;
    this.redisClient = config.redisClient;


    // 쓰레기 관련 api 구현
    return this.router;

};

module.exports = TrashInferface;
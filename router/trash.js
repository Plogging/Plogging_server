const express = require('express');
const cors=require('cors');
const poolAsync = require("../config/mysqlConfig").getMysqlPool; // callback
const poolSync = require("../config/mongoConfig").getMysqlPool2; // async await

const TrashInferface = function(config) {
    const router = express.Router();
    router.all('*',cors());

    this.router = router;

    // 쓰레기 관련 api 구현
    return this.router;

};

module.exports = TrashInferface;
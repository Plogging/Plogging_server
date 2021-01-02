const express = require('express');
const cors=require('cors');
const poolAsync = require("../config/mysqlConfig").getMysqlPool; // callback
const poolSync = require("../config/mongoConfig").getMysqlPool2; // async await
const redisCilent = require("../config/redisConfig");

const UserInferface = function(config) {
    const router = express.Router();
    
    router.all('*',cors());

    this.router = router;

    // 유저 관련 api 구현
    router.get("/", (req, res) => this.testUser(req, res));

    return this.router;

};

UserInferface.prototype.testUser = async function(req, res) {
    res.send("user get api !");
}

module.exports = UserInferface;
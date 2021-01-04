const express = require('express');
const cors=require('cors');

const UserInferface = function(config) {
    const router = express.Router();
    
    router.all('*',cors());

    this.router = router;
    this.mysqlPool = config.mysqlPool;
    this.mysqlPool2 = config.mysqlPool2;
    this.redisClient = config.redisClient;

    // 유저 관련 api 구현
    router.get("/", (req, res) => this.testUser(req, res));

    return this.router;

};

UserInferface.prototype.testUser = async function(req, res) {
    res.send("user get api !");
}

module.exports = UserInferface;
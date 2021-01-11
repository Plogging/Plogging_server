const express = require('express');
const cors=require('cors');

const RankingInterface = function(config) {
    const router = express.Router();
    router.all('*',cors());

    this.router = router;
   this.mysqlPool = config.mysqlPool;
   this.mysqlPool2 = config.mysqlPool2;
    this.redisClient = config.redisClient;

    // 랭킹 관련 api 구현
    router.get("/", (req, res) => this.testRank(req, res));

    return this.router;

};

RankingInterface.prototype.testRank = async function(req, res) {
    res.send("rainking get api !");
}

module.exports = RankingInterface;
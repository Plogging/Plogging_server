const express = require('express');
const cors = require('cors');
const { client } = require('../config/redisConfig');

const weeklyRankingKey = "weekly"
const monthlyRankingKey = "monthly"

const rankReqSchema = {

}

const RankingInterface = function(config) {
    const router = express.Router();
    router.all('*',cors());

    this.router = router;
    this.mysqlPool = config.mysqlPool;
    this.mysqlPool2 = config.mysqlPool2;
    this.redisClient = config.redisClient;

    // 랭킹 관련 api 구현
    router.get("/:rankType", (req, res) => this.getRank(req, res));

    return this.router;

};

/**
 * @swagger
 */
RankingInterface.prototype.getRank = async function(req, res) {
    let rankType = req.params.rankType
    let offset = req.query.offset
    let limit = req.query.limit
    let returnResult
    this.redisClient.multi()
    .zcount(rankType, "-inf", "+inf")
    .zrevrange(rankType, offset, offset+limit-1, "withscores")
    .exec((error, replies) => {
        if (error) {
            returnResult = {rc: 500, rcmsg: "internal server error"}
            res.status(500).json(returnResult)
        } else {
            let count = replies[0]
            let rankData = buildRankData(replies[1])
            returnResult = {rc: 200, rcmsg: "success", count: count, rankData: rankData}
            res.status(200).json(returnResult)
        }
    })
}

const buildRankData = rankWithScores => {
    let rankData = []
    let element
    for (let i=0; i < rankWithScores.length / 2; i++) {
        element = {userId: rankWithScores[2*i], score: rankWithScores[2*i+1]}
        rankData.push(element)
    }
    return rankData
}

module.exports = RankingInterface;
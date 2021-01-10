const express = require('express');
const { promisify } = require('util')
const cors=require('cors');

const weeklyRankingKey = "weekly"
const monthlyRankingKey = "monthly"

const RankingInterface = function(config) {
    const router = express.Router();
    router.all('*',cors());

    this.router = router;
    this.mysqlPool = config.mysqlPool;
    this.mysqlPool2 = config.mysqlPool2;
    this.redisClient = config.redisClient;

    const zcountAsync = promisify(this.redisClient.zcount).bind(this.redisClient)
    const zrevrangeAsync = promisify(this.redisClient.zrevrange).bind(this.redisClient)
    this.zcount = zcountAsync
    this.zrevrange = zrevrangeAsync

    // 랭킹 관련 api 구현
    router.get("/:rankType", (req, res) => this.getRank(req, res));

    return this.router;

};

/**
 * @swagger
 * /rank:
 *   get:
 *     summary: 랭킹 가져오기
 *     tags: [Plogging]
 *     parameters:
 *       - name: rankType
 *         in: path
 *         type: string
 *         enum: [weekly, monthly]
 *         required: true
 *         description: 랭킹 유형 (주간 / 월간)
 *       - name: offset
 *         in: query
 *         type: integer
 *         required: true
 *         description: 랭킹 offset
 *       - name: limit
 *         in: query
 *         type: integer
 *         required: true
 *         description: 랭킹 limit (offset부터 몇 개의 데이터를 가져올건지)
 *     responses:
 *       200:
 *         description: Success
 *         schema:
 *           type: object
 *           properties:
 *              rc:
 *                type: number
 *                example: 200
 *              rcmsg:
 *                type: string
 *                example: success
 *              count:
 *                type: number
 *                example: 10
 *              rankData:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    userId:
 *                      type: string
 *                    score:
 *                      type: integer
 *                example:
 *                  - userId: happy
 *                    score: 18000
 *                  - userId: choco
 *                    score: 17000
 *                  - userId: bori
 *                    score: 16500
 *                  - userid: ttori
 *                    score: 16000
 *                  - userId: momo
 *                    score: 15500
 *                  - userid: congi
 *                    score: 14500
 *                  - userId: coco
 *                    score: 14000
 *                  - userId: hoya
 *                    score: 13500
 *                  - userId: zzangu
 *                    score: 13000
 *                  - userId: duri
 *                    score: 12000
 */
RankingInterface.prototype.getRank = async function(req, res) {
    let rankType = req.params.rankType
    let offset = req.query.offset
    let limit = req.query.limit
    let count = await this.zcount(rankType, "-inf", "+inf")
    let rankWithScores = await this.zrevrange(rankType, offset, offset+limit-1, "withscores")
    let rankData = buildRankData(rankWithScores)
    let returnResult = {rc: 200, rcmsg: "success"}
    returnResult.count = count
    returnResult.rankData = rankData
    res.status(200).json(returnResult)
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
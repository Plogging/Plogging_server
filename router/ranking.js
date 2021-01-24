const express = require('express');
const cors = require('cors');
const swaggerValidation = require('../util/validator')
const logger = require("../util/logger.js")("ranking.js");
const { USER_TABLE } = require('./user')

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
    router.get("/global", swaggerValidation.validate, (req, res) => this.getGlobalRank(req, res));
    router.get("/users/:id", swaggerValidation.validate, (req, res) => this.getUserRank(req, res))
    return this.router;

};

RankingInterface.prototype.getGlobalRank = async function(req, res) {
    try {
        const rankType = req.query.rankType
        const offset = req.query.offset
        const limit = req.query.limit
        logger.info(`Fetching ${rankType} global ranking from redis...`)
        const [zcountResult, zrevrangeResult] = await this.redisClient.pipeline()
        .zcount(rankType, "-inf", "+inf")
        .zrevrange(rankType, offset, offset+limit-1, "withscores")
        .exec()
        const count = zcountResult[1]
        const rankData = await this.buildRankData(zrevrangeResult[1])
        const returnResult = {rc: 200, rcmsg: "success", count: count, rankData: rankData}
        res.status(200).json(returnResult)
    } catch(e) {
        logger.error(e.message)
        const returnResult = { rc: 500, rcmsg: e.message }
        res.status(500).json(returnResult)
    }
}

RankingInterface.prototype.getUserRank = async function(req, res) {
    try {
        const rankType = req.query.rankType
        const targetUserId = req.params.id
        logger.info(`Fetching ${rankType} rank of user ${targetUserId} from redis...`)
        const [zrankResult, zscoreResult] = await this.redisClient.pipeline()
        .zrank(rankType, targetUserId)
        .zscore(rankType, targetUserId)
        .exec()
        const rank = zrankResult[1]
        const score = zscoreResult[1]
        const { userId, displayName, profileImg } = await this.getUserInfo(targetUserId)
        const userRankData = {userId: userId, displayName: displayName, profileImg: profileImg,
        rank: rank, score: score}
        const returnResult = {rc: 200, rcmsg: "success", userRankData: userRankData}
        res.status(200).json(returnResult)
    } catch(e) {
        logger.error(e.message)
        const returnResult = { rc: 500, rcmsg: e.message }
        res.status(500).json(returnResult)
    }
}

RankingInterface.prototype.buildRankData = async function(rankWithScores) {
    const userIds = []
    const scores = []
    for (let i=0; i < rankWithScores.length / 2; i++) {
        userIds.push(rankWithScores[2*i])
        scores.push(rankWithScores[2*i + 1])
    }

    const userInfos = await this.getUserInfos(userIds)

    const rankData = []
    for (let i=0; i < userIds.length; i++) {
        userId = userIds[i]
        score = scores[i]
        userInfo = userInfos[userId]
        userInfo.score = score
        rankData.push(userInfo)
    }
    return rankData
}

RankingInterface.prototype.getUserInfo = async function(userId) {
    const query = `SELECT user_id, display_name, profile_img from ${USER_TABLE} WHERE user_id = ?`
    logger.info(`Fetching user data of user ${userId} from DB...`)
    const [rows, _] = await this.mysqlPool2.promise().query(query, [userId])
    const { user_id, display_name, profile_img } = rows[0]
    const userInfo = { userId: user_id, displayName: display_name, profileImg: profile_img }
    return userInfo
}

RankingInterface.prototype.getUserInfos = async function(userIds) {
    if (userIds.length == 0) return {}
    const query = `SELECT user_id, display_name, profile_img from ${USER_TABLE} WHERE user_id in 
    (` + userIds.map(() => '?') + `)`
    logger.info(`Fetching user data of users ${userIds} from DB...`)
    const [rows, _] = await this.mysqlPool2.promise().query(query, userIds)
    const userInfos = {}
    rows.forEach(row => {
        const { user_id, display_name, profile_img } = row
        userInfos[user_id] = { userId: user_id, displayName: display_name, 
            profileImg: profile_img }
    })
    return userInfos
}

module.exports = RankingInterface;
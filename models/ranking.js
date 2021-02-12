const redisClient = require('../config/redisConfig.js')
const logger = require("../util/logger.js")("ranking.js")

const RankSchema = {}

RankSchema.WEEKLY = "weekly"
RankSchema.MONTHLY = "monthly"

RankSchema.getCountAndRankDataWithScores = async (rankType, cntPerPage, pageNumber) => {
    // TODO: rankType이 weekly나 monthly가 아닐 경우 throw
    logger.info(`Trying to get ${rankType} global rank data from Redis.`)
    const [zcountResult, zrevrangeResult] = await redisClient.multi()
    .zcount(rankType, "-inf", "+inf")
    .zrevrange(rankType, cntPerPage * (pageNumber - 1), cntPerPage * pageNumber - 1, "withscores")
    .exec()
    const count = zcountResult[1]
    const rankDataWithScores = zrevrangeResult[1]
    return [count, rankDataWithScores]
}

RankSchema.getUserRankAndScore = async (rankType, userId) => {
    // TODO: rankType이 weekly나 monthly가 아닐 경우 throw
    logger.info(`Trying to get ${rankType} user rank data of ${userId} from Redis.`)
    const [zrankResult, zscoreResult] = await redisClient.multi()
    .zrank(rankType, userId)
    .zscore(rankType, userId)
    .exec()
    const rank = zrankResult[1]
    const score = zscoreResult[1]
    return [rank, score]
}

RankSchema.update = async (userId, score) => {
    await redisClient.multi()
    .zincrby(RankSchema.WEEKLY, score, userId)
    .zincrby(RankSchema.MONTHLY, score, userId)
    .exec()
}

RankSchema.delete = async (userId) => {
    await redisClient.multi()
    .zrem(RankSchema.WEEKLY, userId)
    .zrem(RankSchema.MONTHLY, userId)
    .exec()
}

module.exports = RankSchema
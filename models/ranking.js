const redisClient = require('../config/redisConfig.js')

const RankSchema = {}

RankSchema.WEEKLY = "weekly"
RankSchema.MONTHLY = "monthly"

RankSchema.getCountAndRankDataWithScores = async (rankType, offset, limit) => {
    // TODO: rankType이 weekly나 monthly가 아닐 경우 throw
    const [zcountResult, zrevrangeResult] = await redisClient.pipeline()
    .zcount(rankType, "-inf", "+inf")
    .zrevrange(rankType, offset, offset+limit-1, "withscores")
    .exec()
    const count = zcountResult[1]
    const rankDataWithScores = zrevrangeResult[1]
    return [count, rankDataWithScores]
}

RankSchema.getUserRankAndScore = async (rankType, userId) => {
    // TODO: rankType이 weekly나 monthly가 아닐 경우 throw
    const [zrankResult, zscoreResult] = await this.redisClient.pipeline()
    .zrank(rankType, userId)
    .zscore(rankType, userId)
    .exec()
    const rank = zrankResult[1]
    const score = zscoreResult[1]
    return [rank, score]
}

RankSchema.update = async (userId, score) => {
    await redisClient.pipeline()
    .zincrby(RankSchema.WEEKLY, score, userId)
    .zincrby(RankSchema.MONTHLY, score, userId)
    .exec()
}

RankSchema.delete = async (userId) => {
    await redisClient.pipeline()
    .zrem(RankSchema.WEEKLY, userId)
    .zrem(RankSchema.MONTHLY, userId)
    .exec()
}

module.exports = RankSchema
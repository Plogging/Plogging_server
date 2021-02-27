const redisClient = require('../config/redisConfig.js')

const RankSchema = {}

RankSchema.DISTANCE_WEEKLY = "distance_weekly"
RankSchema.DISTANCE_MONTHLY = "distance_monthly"
RankSchema.TRASH_WEEKLY = "trash_weekly"
RankSchema.TRASH_MONTHLY = "trash_monthly"
RankSchema.SCORE_WEEKLY = "score_weekly"
RankSchema.SCORE_MONTHLY = "score_monthly"

RankSchema.getCountAndRankDataWithScores = async (rankType, cntPerPage, pageNumber) => {
    // TODO: rankType이 weekly나 monthly가 아닐 경우 throw
    const [zcountResult, zrevrangeResult] = await redisClient.multi()
    .zcount(rankType, "-inf", "+inf")
    .zrevrange(rankType, cntPerPage * (pageNumber - 1), cntPerPage * pageNumber - 1, "withscores")
    .exec()
    const count = zcountResult[1]
    const rankDataWithScores = zrevrangeResult[1]
    return [count, rankDataWithScores]
}

RankSchema.getUserDistance = async (distanceType, userId) => {
    // TODO: distanceType이 DISTANCE_WEEKLY나 DISTANCE_MONTHLY가 아닐 경우 throw
    const userDistance = await redisClient.hget(distanceType, userId)
    if (userDistance == null) {
        return 0
    } else {
        return userDistance
    }
}

RankSchema.getUserNumTrash = async (numTrashType, userId) => {
    // TODO: numTrashType이 TRASH_WEEKLY나 TRASH_MONTHLY가 아닐 경우 throw
    const userNumTrash = await redisClient.hget(numTrashType, userId)
    if (userNumTrash == null) {
        return 0
    } else {
        return userNumTrash
    }
}

RankSchema.getUserScore = async (rankType, userId) => {
    const userScore = await redisClient.zscore(rankType, userId)
    if (userScore == null) {
        return 0
    } else {
        return userScore
    }
}

RankSchema.getUserRankAndScore = async (rankType, userId) => {
    // TODO: rankType이 SCORE_WEEKLY나 SCORE_MONTHLY가 아닐 경우 throw
    const [zrankResult, zscoreResult] = await redisClient.multi()
    .zrevrank(rankType, userId)
    .zscore(rankType, userId)
    .exec()
    const rank = zrankResult[1]
    const score = zscoreResult[1]
    return [rank, score]
}

RankSchema.updateDistance = async (userId, distance) => {
    await redisClient.multi()
    .hincrby(RankSchema.DISTANCE_WEEKLY, userId, distance)
    .hincrby(RankSchema.DISTANCE_MONTHLY, userId, distance)
    .exec()
}

RankSchema.updateTrash = async (userId, numTrash) => {
    await redisClient.multi()
    .hincrby(RankSchema.TRASH_WEEKLY, userId, numTrash)
    .hincrby(RankSchema.TRASH_MONTHLY, userId, numTrash)
    .exec()
}

RankSchema.updateScore = async (userId, score) => {
    await redisClient.multi()
    .zincrby(RankSchema.SCORE_WEEKLY, score, userId)
    .zincrby(RankSchema.SCORE_MONTHLY, score, userId)
    .exec()
}

RankSchema.deleteDistance = async (userId) => {
    await redisClient.multi()
    .hdel(RankSchema.DISTANCE_WEEKLY, userId)
    .hdel(RankSchema.DISTANCE_MONTHLY, userId)
    .exec()
}

RankSchema.deleteTrash = async (userId) => {
    await redisClient.multi()
    .hdel(RankSchema.TRASH_WEEKLY, userId)
    .hdel(RankSchema.TRASH_MONTHLY, userId)
    .exec()
}

RankSchema.deleteScore = async (userId) => {
    await redisClient.multi()
    .zrem(RankSchema.SCORE_WEEKLY, userId)
    .zrem(RankSchema.SCORE_MONTHLY, userId)
    .exec()
}

module.exports = RankSchema
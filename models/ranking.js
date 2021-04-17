const redisClient = require('../config/redisConfig.js')
const logger = require("../util/logger.js")("ranking.js")

const RankSchema = {}

RankSchema.DISTANCE_WEEKLY = "distance_weekly"
RankSchema.DISTANCE_MONTHLY = "distance_monthly"
RankSchema.TRASH_WEEKLY = "trash_weekly"
RankSchema.TRASH_MONTHLY = "trash_monthly"
RankSchema.SCORE_WEEKLY = "score_weekly"
RankSchema.SCORE_MONTHLY = "score_monthly"

RankSchema.getCountAndRankDataWithScores = async (rankType, cntPerPage, pageNumber) => {
    // TODO: rankType이 SCORE_WEEKLY나 SCORE_MONTHLY가 아닐 경우 throw
    logger.info(`Trying to get ${rankType} global rank data from Redis.`)
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
    // TODO: rankType이 SCORE_WEEKLY나 SCORE_MONTHLY가 아닐 경우 throw
    const userScore = await redisClient.zscore(rankType, userId)
    if (userScore == null) {
        return 0
    } else {
        return userScore
    }
}

RankSchema.getUserRankAndScore = async (rankType, userId) => {
    // TODO: rankType이 SCORE_WEEKLY나 SCORE_MONTHLY가 아닐 경우 throw
    logger.info(`Trying to get ${rankType} user rank data of ${userId} from Redis.`)
    const [zrankResult, zscoreResult] = await redisClient.multi()
    .zrevrank(rankType, userId)
    .zscore(rankType, userId)
    .exec()
    const rank = zrankResult[1]
    const score = zscoreResult[1]
    return [rank, score]
}

RankSchema.setDistance = async (userId, distance, distanceType) => {
    if (distanceType == undefined) {
        await redisClient.multi()
        .hset(RankSchema.DISTANCE_WEEKLY, userId, distance)
        .hset(RankSchema.DISTANCE_MONTHLY, userId, distance)
        .exec()
    } else {
        await redisClient.hset(distanceType, userId, distance)
    }
}

RankSchema.setTrash = async (userId, numTrash, trashType) => {
    if (trashType == undefined) {
        await redisClient.multi()
        .hset(RankSchema.TRASH_WEEKLY, userId, numTrash)
        .hset(RankSchema.TRASH_MONTHLY, userId, numTrash)
        .exec()
    } else {
        await redisClient.hset(trashType, userId, numTrash)
    }
}

RankSchema.setScore = async (userId, score, rankType) => {
    if (rankType == undefined) {
        await redisClient.multi()
        .zadd(RankSchema.SCORE_WEEKLY, score, userId)
        .zadd(RankSchema.SCORE_MONTHLY, score, userId)
        .exec()
    } else {
        await redisClient.zadd(rankType, score, userId)
    }
}

RankSchema.updateDistance = async (userId, distance, distanceType) => {
    if (distanceType == undefined) {
        await redisClient.multi()
        .hincrby(RankSchema.DISTANCE_WEEKLY, userId, distance)
        .hincrby(RankSchema.DISTANCE_MONTHLY, userId, distance)
        .exec()
    } else {
        await redisClient.hincrby(distanceType, userId, distance)
    }
}

RankSchema.updateTrash = async (userId, numTrash, trashType) => {
    if (trashType == undefined) {
        await redisClient.multi()
        .hincrby(RankSchema.TRASH_WEEKLY, userId, numTrash)
        .hincrby(RankSchema.TRASH_MONTHLY, userId, numTrash)
        .exec()
    } else {
        await redisClient.hincrby(trashType, userId, numTrash)
    }
}

RankSchema.updateScore = async (userId, score, rankType) => {
    if (rankType == undefined) {
        await redisClient.multi()
        .zincrby(RankSchema.SCORE_WEEKLY, score, userId)
        .zincrby(RankSchema.SCORE_MONTHLY, score, userId)
        .exec()
    } else {
        await redisClient.zincrby(rankType, score, userId)
    }
}

RankSchema.deleteDistance = async (userId, distanceType) => {
    if (distanceType == undefined) {
        await redisClient.multi()
        .hdel(RankSchema.DISTANCE_WEEKLY, userId)
        .hdel(RankSchema.DISTANCE_MONTHLY, userId)
        .exec()
    } else {
        await redisClient.hdel(distanceType, userId)
    }
}

RankSchema.deleteTrash = async (userId, trashType) => {
    if (trashType == undefined) {
        await redisClient.multi()
        .hdel(RankSchema.TRASH_WEEKLY, userId)
        .hdel(RankSchema.TRASH_MONTHLY, userId)
        .exec()
    } else {
        await redisClient.hdel(trashType, userId)
    }
}

RankSchema.deleteScore = async (userId, rankType) => {
    if (rankType == undefined) {
        await redisClient.multi()
        .zrem(RankSchema.SCORE_WEEKLY, userId)
        .zrem(RankSchema.SCORE_MONTHLY, userId)
        .exec()
    } else {
        await redisClient.zrem(rankType, userId)
    }
}

module.exports = RankSchema
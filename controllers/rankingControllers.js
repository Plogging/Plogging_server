const { NotFound } = require('throw.js')
const logger = require("../util/logger.js")("ranking.js")

const RankSchema = require('../models/ranking')
const { findOneUser, findUsers } = require('../models/users')
const pagingHelper = require('../util/pagingHelper')

const getGlobalRank = async (req, res) => {
    const rankType = req.query.rankType
    const rankCntPerPage = req.query.rankCntPerPage ?? 10
    const pageNumber = req.query.pageNumber ?? 1
    const [count, rawRankData] = await RankSchema.getCountAndRankDataWithScores(rankType, rankCntPerPage, pageNumber)
    if (!count || !rawRankData) {
        throw new NotFound("Rank data doesn't exist in Redis.")
    }
    const rankData = await buildRankData(rawRankData)
    const meta = {startPageNumber: 1, endPageNumber: pagingHelper.calcLastPage(count, rankCntPerPage), currentPageNumber: pageNumber}
    const returnResult = {rc: 200, rcmsg: "success", meta: meta, data: rankData}
    res.status(200).json(returnResult)
}

const getUserRank = async (req, res) => {
    const rankType = req.query.rankType
    const targetUserId = req.params.id
    logger.info(`Fetching ${rankType} rank of user ${targetUserId} from redis...`)
    const [rank, score] = await RankSchema.getUserRankAndScore(rankType, targetUserId)
    if (!rank || !score) {
        throw new NotFound("User data doesn't exist in Redis.")
    }
    const { userId, displayName, profileImg } = await getUserInfo(targetUserId)
    const userRankData = {userId: userId, displayName: displayName, profileImg: profileImg,
    rank: rank, score: score}
    const returnResult = {rc: 200, rcmsg: "success", data: userRankData}
    res.status(200).json(returnResult)
}

const buildRankData = async rawRankData => {
    const userIds = []
    const scores = []
    for (let i=0; i < rawRankData.length / 2; i++) {
        userIds.push(rawRankData[2*i])
        scores.push(rawRankData[2*i + 1])
    }

    const userInfos = await getUserInfos(userIds)

    const rankData = []
    for (let i=0; i < userIds.length; i++) {
        userId = userIds[i]
        score = scores[i]
        let userInfo = userInfos[userId]
        if (userInfos) {
            userInfo.score = score
            rankData.push(userInfo)
        }
    }
    return rankData
}

const getUserInfo = async userId => {
    const fetched = await findOneUser(userId)
    if (!fetched) {
        throw new NotFound("User data doesn't exist in DB.")
    }
    const { user_id, display_name, profile_img } = fetched.dataValues
    const userInfo = { userId: user_id, displayName: display_name, profileImg: profile_img }
    return userInfo
}

const getUserInfos = async userIds => {
    if (userIds.length == 0) return {}
    const userInfos = {}
    const fetched = await findUsers(userIds)
    if (!fetched) {
        throw new NotFound("User data not found in DB.")
    }
    fetched.forEach(row => {
        const { user_id, display_name, profile_img } = row.dataValues
        userInfos[user_id] = { userId: user_id, displayName: display_name, 
            profileImg: profile_img }
    })
    return userInfos
}

module.exports = {
    getGlobalRank,
    getUserRank
}
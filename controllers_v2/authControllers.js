const logger = require("../util/logger.js")("user.js");
const {BadRequest, Unauthorized, Conflict, InternalServerError } = require('throw.js');
const resString = require('../util/resConstMsg');
const UserSchema = require('../models/user.js');
const RankSchema = require('../models/ranking');
const cryptoHelper = require('../util/cryptoHelper');
const {sequelize} = require('../models/index');

//  우선 로그인은 소셜로그인과 자체로그인으로 나뉜다. 이메일 뒤에 :가 있는지 없는지에 따라 판단한다.
//  apple 로그인에서 appleIdentifier을 활용할 경우 모든 정보를 준다.
const signIn = async(req, res) => {
    const userId = req.body.userId;
    const userName = req.body.userName;
    const appleIdentifier = req.body.appleIdentifier;
    if(!userId && appleIdentifier){
        logger.info(`appleSignIn [${req.session.userId}] ...`);
        let returnResult = {};
        const user = await UserSchema.findAppleUser(appleIdentifier);
        if(!user){
            throw new NotFound(resString.ERR_EMAIL);
        }
        req.session.userId = user.user_id;
        returnResult.rc = 200;
        returnResult.rcmsg = resString.SUCCESS;
        returnResult.userId = user.user_id;
        returnResult.userImg = user.profile_img;
        returnResult.userName = user.display_name;
        returnResult.scoreMonthly = Number(await RankSchema.getUserScore(RankSchema.SCORE_MONTHLY, user.user_id));
        returnResult.distanceMonthly = Number(await RankSchema.getUserDistance(RankSchema.DISTANCE_MONTHLY, user.user_id));
        returnResult.trashMonthly = Number(await RankSchema.getUserNumTrash(RankSchema.TRASH_MONTHLY, user.user_id));
        returnResult.scoreWeekly = Number(await RankSchema.getUserScore(RankSchema.SCORE_WEEKLY, user.user_id));
        returnResult.distanceWeekly = Number(await RankSchema.getUserDistance(RankSchema.DISTANCE_WEEKLY, user.user_id));
        returnResult.trashWeekly = Number(await RankSchema.getUserNumTrash(RankSchema.TRASH_WEEKLY, user.user_id));
        return res.json(returnResult);
    }
    if(userId.split(":")[1]){  // social login
        let returnResult = {};
        if(!userId) throw new BadRequest;
        logger.info(`Connecting to [${userId}] from OAuth...`);
        await sequelize.transaction(async (t) => {
            const user = await UserSchema.findOneUser(userId, null, t);
            if(!user){
                try {
                    let userImg = `${process.env.SERVER_REQ_INFO}/profile/base/profile-${Math.floor(( Math.random() * 3) + 1)}.PNG`;
                    const newUser = await UserSchema.createUser(userId, userName, appleIdentifier, userImg, null, null, t);
                    req.session.userId = newUser.user_id;
                    returnResult.rc = 201;
                    returnResult.rcmsg = resString.CREATED;
                    returnResult.userImg = newUser.profile_img;
                    returnResult.userName = newUser.display_name;
                    res.json(returnResult);;
                } catch (error) {
                    if(error.original && error.original.errno === 1062){
                        throw new Conflict(resString.EXISTED_NAME);
                    }
                    throw new InternalServerError; 
                }
            }else{
                if(user.type == 'apple' && !user.appleIdentifier && appleIdentifier){
                    UserSchema.updateUserAppleIdentifier(userId, appleIdentifier);
                }
                req.session.userId = user.user_id;
                returnResult.rc = 200;
                returnResult.rcmsg = resString.SUCCESS;
                returnResult.userImg = user.profile_img;
                returnResult.userName = user.display_name;
                res.json(returnResult);
            }
        })
    }else{ // custom sign in
        const userId = userId + ':custom';
        let returnResult = {};
        logger.info(`Logging in with [${userId}] ...`);
        const userData = await UserSchema.findOneUser(userId);
        if(!userData){ throw new Unauthorized(resString.ERR_EMAIL) }
        const userDigest = userData.digest;
        const digest = cryptoHelper.digest(req.body.secretKey, userData.salt);
        if(userDigest != digest) { throw new Unauthorized(resString.ERR_PASSWORD) }
        req.session.userId = userId;
        returnResult.rc = 200;
        returnResult.rcmsg = resString.SUCCESS;
        returnResult.userImg = userData.profile_img;
        returnResult.userName = userData.display_name;
        res.json(returnResult);
    }
}

const signOut = async(req, res) => {
    logger.info(`Signing out of [${req.session.userId}] ...`);
    req.session.destroy(function(err) {
        if(err) {
            throw new InternalServerError;
        }else{
            res.clearCookie('connect.sid');
            res.json({rc: 200, rcmsg: resString.SUCCESS});
        }
    })
}

module.exports = {
    signIn,
    signOut
}
const logger = require("../util/logger.js")("user.js");
const { Unauthorized, Conflict, InternalServerError } = require('throw.js');
const resString = require('../util/resConstMsg');
const UserSchema = require('../models/user.js');
const cryptoHelper = require('../util/cryptoHelper');
const {sequelize} = require('../models/index');

const resUser = (user, statusCode, req, sendUserId) => {
    let returnResult = {};
    req.session.userId = user.user_id;
    returnResult.rc = statusCode;
    returnResult.rcmsg = statusCode == 200 ? resString.SUCCESS: resString.CREATED;
    if(sendUserId) returnResult.userId = user.userId;
    returnResult.userImg = user.profile_img;
    returnResult.userName = user.display_name;
    return returnResult;
}

//  우선 로그인은 소셜로그인과 자체로그인으로 나뉜다. 이메일 뒤에 :가 있는지 없는지에 따라 판단한다.
//  apple 로그인에서 appleIdentifier을 활용할 경우 모든 정보를 준다.
const signIn = async(req, res) => {
    const userId = req.body.userId;
    const userName = req.body.userName;
    const appleIdentifier = req.body.appleIdentifier;
    if(!userId && appleIdentifier){
        logger.info(`Apple signing in [${req.session.userId}] ...`);
        const user = await UserSchema.findAppleUser(appleIdentifier);
        if(!user) throw new NotFound(resString.ERR_EMAIL);
        return res.json(resUser(user, 200, req, true));
    }
    if(userId.split(":")[1]){  // social login
        logger.info(`Connecting to [${userId}] from OAuth...`);
        await sequelize.transaction(async (t) => {
            const user = await UserSchema.findOneUser(userId, null, t);
            if(!user){
                try {
                    let userImg = `${process.env.SERVER_REQ_INFO}/profile/base/profile-${Math.floor(( Math.random() * 3) + 1)}.PNG`;
                    const newUser = await UserSchema.createUser(userId, userName, appleIdentifier, userImg, null, null, t);
                    res.status(201).json(resUser(newUser, 201, req, false));
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
                res.json(resUser(user, 200, req, false));
            }
        })
    }else{ // custom sign in
        const userId = userId + ':custom';
        logger.info(`Custom signing in with [${userId}] ...`);
        const userData = await UserSchema.findOneUser(userId);
        if(!userData){ throw new Unauthorized(resString.ERR_EMAIL) }
        const userDigest = userData.digest;
        const digest = cryptoHelper.digest(req.body.secretKey, userData.salt);
        if(userDigest != digest) { throw new Unauthorized(resString.ERR_PASSWORD) }
        res.json(resUser(userData, 200, req, false));
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
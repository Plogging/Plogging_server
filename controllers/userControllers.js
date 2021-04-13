const nodemailer = require('nodemailer');
const Email = require('email-templates');
const logger = require("../util/logger.js")("user.js");
const fs = require('fs');
const { NotFound, Unauthorized, Conflict, InternalServerError } = require('throw.js')
const jasypt = require('../util/common_jasypt.js');
const UserSchema = require('../models/user.js');
const ploggingFilePath = process.env.IMG_FILE_PATH + "/plogging/";
const profileFilePath = process.env.IMG_FILE_PATH + "/profile/";
const adminEmailId = process.env.ADMIN_EMAIL_ID;
const adminEmailPassword = jasypt.decrypt(process.env.ADMIN_EMAIL_PASSWORD);
const serverUrl = process.env.SERVER_REQ_INFO;
const {sequelize} = require('../models/index');
const RankSchema = require('../models/ranking');
const PloggingSchema = require('../models/plogging');
const resString = require('../util/resConstMsg');
const cryptoHelper = require('../util/cryptoHelper');

const signIn = async(req, res) => {
    const userId = req.body.userId + ':custom';
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

const social = async(req, res) => {
    let returnResult = {};
    const userId = req.body.userId;
    const userName = req.body.userName;
    const appleIdentifier = req.body.appleIdentifier;
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
                res.status(201).json(returnResult);
            } catch (error) {
                if(error.original && error.original.errno === 1062){
                    throw new Conflict(resString.EXISTED_NAME);
                }
                throw new InternalServerError
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
}

const register = async(req, res) => {
    let returnResult = {};
    const secretKey = req.body.secretKey;
    const userName = req.body.userName;
    const userType = 'custom';
    const userId = req.body.userId + ':' + userType;
    logger.info(`Registering [${userId}] into maria DB...`);
    
    await sequelize.transaction(async (t) => {
        const user = await UserSchema.findOneUser(userId, null, t);
        if (user) {
            res.status(410).json({rc: 410, rcmsg: resString.EXISTED_ID});
            return;
        }
        try {
            const salt = cryptoHelper.salt();
            const digest = cryptoHelper.digest(secretKey, salt);
            let userImg = `${process.env.SERVER_REQ_INFO}/profile/base/profile-${Math.floor(( Math.random() * 3) + 1)}.PNG`;
            const newUser = await UserSchema.createUser(userId, userName, null, userImg, digest, salt, t);
            req.session.userId = newUser.user_id;
            returnResult.rc = 201;
            returnResult.rcmsg = resString.CREATED;
            returnResult.userImg = newUser.profile_img;
            returnResult.userName = newUser.display_name;
            res.status(201).json(returnResult);
        } catch (error) {
            if(error.original && error.original.errno === 1062){
                throw new Conflict(resString.EXISTED_NAME);
            }
            throw new InternalServerError
        }
    })
}

const checkUserId = async(req, res) => {
    logger.info(`Checking [${req.body.userId}]...`);
    const user = await UserSchema.findOneUser(req.body.userId + ':custom');
    if(user){
        res.status(201).json({rc: 201, rcmsg: resString.EXISTED_ID});
    }else{
        res.json({rc: 200, rcmsg: resString.ERR_EMAIL});
    }
}

const getUserInfo = async(req, res) => {
    logger.info(`Getting [${req.params.id}] information...`);
    let returnResult = {};
    const user = await UserSchema.findOneUser(req.params.id);
    if(!user){
        throw new NotFound(resString.ERR_EMAIL);
    }
    returnResult.rc = 200;
    returnResult.rcmsg = resString.SUCCESS;
    returnResult.userId = user.user_id;
    returnResult.userImg = user.profile_img;
    returnResult.userName = user.display_name;
    returnResult.scoreMonthly = Number(await RankSchema.getUserScore(RankSchema.SCORE_MONTHLY, req.params.id));
    returnResult.distanceMonthly = Number(await RankSchema.getUserDistance(RankSchema.DISTANCE_MONTHLY, req.params.id));
    returnResult.trashMonthly = Number(await RankSchema.getUserNumTrash(RankSchema.TRASH_MONTHLY, req.params.id));
    returnResult.scoreWeekly = Number(await RankSchema.getUserScore(RankSchema.SCORE_WEEKLY, req.params.id));
    returnResult.distanceWeekly = Number(await RankSchema.getUserDistance(RankSchema.DISTANCE_WEEKLY, req.params.id));
    returnResult.trashWeekly = Number(await RankSchema.getUserNumTrash(RankSchema.TRASH_WEEKLY, req.params.id));
    res.json(returnResult);
}

const appleSignIn = async(req, res) => {
    logger.info(`appleSignIn [${req.session.userId}] ...`);
    let returnResult = {};
    const appleIdentifier = req.body.appleIdentifier;
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
    res.json(returnResult);
}

const changeUserName = async(req, res) => {
    logger.info(`Changing user's name of [${req.session.userId}] ...`);
    let returnResult = {};
    try {
        const [updatedCnt] = await UserSchema.updateUserName(req.session.userId, req.body.userName);
        if(!updatedCnt){
            throw new InternalServerError
        }
        returnResult.rc = 200;
        returnResult.rcmsg = resString.SUCCESS;
        returnResult.userName = req.body.userName;
        res.send(returnResult);
    } catch (error) {
        if(error.original.errno === 1062){
            throw new Conflict(resString.EXISTED_NAME);
        }
        throw new InternalServerError
    }
}

const changeUserImage = async(req, res) => {
    logger.info(`Changing user's image of [${req.session.userId}] ...`);
    let returnResult = {};
    const profileImg = process.env.SERVER_REQ_INFO + '/' + req.file.path.split(`${process.env.IMG_FILE_PATH}/`)[1];
    // TODO: sql 오류에도 파일 이미지는 정상으로 바뀜
    const [updatedCnt] = await UserSchema.updateUserImg(req.session.userId, profileImg);
    if(!updatedCnt){
        throw new InternalServerError
    }
    returnResult.rc = 200;
    returnResult.rcmsg = resString.SUCCESS;
    returnResult.profileImg = profileImg;
    res.send(returnResult);
}

const changePassword = async(req, res) => {
    logger.info(`Changing user's password of [${req.session.userId}] ...`);
    const userData = await UserSchema.findOneUser(req.session.userId);
    if(!userData){ throw new Unauthorized(resString.ERR_EMAIL) }
    const userDigest = userData.digest;
    const digest = cryptoHelper.digest(req.body.existedSecretKey, userData.salt);
    if(userDigest != digest) { 
        res.status(402).json({rc: 402, rcmsg: resString.ERR_PASSWORD});
        return;
    }
    const salt = cryptoHelper.salt();
    const newDigest = cryptoHelper.digest(req.body.newSecretKey, salt);
    await UserSchema.changeUserPassword(
        req.session.userId,
        newDigest,
        salt
    );
    res.json({rc: 200, rcmsg: resString.SUCCESS});
}

const temporaryPassword = async(req, res) => {
    logger.info(`Sending user's password of [${req.body.email}] to Email...`);
    const tempPassword = Math.random().toString(36).slice(2);
    await sendEmail(req.body.email, tempPassword);
    const salt = cryptoHelper.salt();
    const digest = cryptoHelper.digest(tempPassword, salt);
    const [updatedCnt] = await UserSchema.changeUserPassword(
        req.body.email + ':custom',
        digest,
        salt
    );
    if(updatedCnt) {
        res.json({rc: 200, rcmsg: resString.SUCCESS});
    }else{
        throw new NotFound(resString.ERR_EMAIL);
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

const withdrawal = async(req, res) => {
    logger.info(`Withdrawing [${req.session.userId}] ...`);
    const userId = req.session.userId;
    const t = await sequelize.transaction(); 
    try {   
        await PloggingSchema.deletePloggingsModel(userId);
        const profileImgPath = `${profileFilePath}${userId}`;
        if(fs.existsSync(profileImgPath)) fs.rmdirSync(profileImgPath, { recursive: true });
        const ploggingImgPath = `${ploggingFilePath}${userId}`;
        if (fs.existsSync(ploggingImgPath)) fs.rmdirSync(ploggingImgPath, { recursive: true });
        await RankSchema.deleteDistance(userId);
        await RankSchema.deleteTrash(userId);
        await RankSchema.deleteScore(userId);
        req.session.destroy();
        res.clearCookie('connect.sid');
        const deletedCnt = await UserSchema.deleteUser(userId, t);
        if(!deletedCnt){ throw new InternalServerError }
        await t.commit();
        res.json({rc: 200, rcmsg: resString.SUCCESS});
    }catch(err) {
        await t.rollback();
        throw new InternalServerError;
    }
}

const sendEmail = async(userEmail, tempPassword) => {
    let emailStringList = ['tempPassword', '[Eco run] 임시 비밀번호 입니다'];
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: adminEmailId,
            pass: adminEmailPassword
        },
    });
    const email = new Email({
        transport: transporter,
        send: true,
        preview: false,
        views: {
            options: {
                extension: 'ejs'
            }
        }
    });
    email.send({
        template: emailStringList[0],
        message: {
            from: 'Eco run<ploggingteam@gmail.com>', 
            to: userEmail, 
            subject: emailStringList[1]
        },
        locals: {
            name: userEmail,
            password: tempPassword,
            url: serverUrl + '/user/password/temp',
            imageUrl: serverUrl + '/profile/base/plogging-email-logo.png'
        }})
        .then((logger.info(`${userEmail} email has been sent!`)))
}

module.exports = {
    signIn,
    social,
    register,
    checkUserId,
    getUserInfo,
    appleSignIn,
    changeUserName,
    changeUserImage,
    changePassword,
    temporaryPassword,
    signOut,
    withdrawal,
    sendEmail,
}
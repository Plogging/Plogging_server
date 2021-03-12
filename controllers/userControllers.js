const nodemailer = require('nodemailer');
const Email = require('email-templates');
const logger = require("../util/logger.js")("user.js");
const fs = require('fs');
const { NotFound, Unauthorized, Conflict, InternalServerError } = require('throw.js')
const jasypt = require('../util/common_jasypt.js');
const UserSchema = require('../models/user.js');
const filePath = process.env.IMG_FILE_PATH + "/profile/";
const adminEmailId = process.env.ADMIN_EMAIL_ID;
const adminEmailPassword = jasypt.decrypt(process.env.ADMIN_EMAIL_PASSWORD);
const serverUrl = process.env.SERVER_REQ_INFO;
const {sequelize} = require('../models/index');
const RankSchema = require('../models/ranking');
const PloggingSchema = require('../models/plogging');
const crypto = require('crypto');
const coString = require('../util/resConstMsg');

const signIn = async(req, res) => {
    const userId = req.body.userId + ':custom';
    let returnResult = {};
    logger.info(`Logging in with [${userId}] ...`);
    const userData = await UserSchema.findOneUser(userId);
    if(!userData){ throw new Unauthorized(coString.ERR_EMAIL) }
    const userDigest = userData.digest;
    const digest = crypto.pbkdf2Sync(req.body.secretKey, userData.salt, 10000, 64, 'sha512').toString('base64');
    if(userDigest != digest) { 
        res.status(402).json({rc: 402, rcmsg: coString.ERR_PASSWORD}); 
        return;
    }
    req.session.userId = userId;
    returnResult.rc = 200;
    returnResult.rcmsg = coString.SUCCESS;
    returnResult.userImg = userData.profile_img;
    returnResult.userName = userData.display_name;
    res.json(returnResult);
}

const social = async(req, res) => {
    let returnResult = {};
    const userId = req.body.userId;
    const userName = req.body.userName;
    logger.info(`Connecting to [${userId}] from OAuth...`);
    await sequelize.transaction(async (t) => {
        const user = await UserSchema.findOneUser(userId, null, t);
        if(!user){
            try {
                let userImg = `${process.env.SERVER_REQ_INFO}/profile/base/profile-${Math.floor(( Math.random() * 3) + 1)}.PNG`;
                const newUser = await UserSchema.createUser(userId, userName, userImg, null, null, t);
                req.session.userId = newUser.user_id;
                returnResult.rc = 201;
                returnResult.rcmsg = coString.CREATED;
                returnResult.userImg = newUser.profile_img;
                returnResult.userName = newUser.display_name;
                res.status(201).json(returnResult);
            } catch (error) {
                if(error.original && error.original.errno === 1062){
                    throw new Conflict(coString.EXISTED_NAME);
                }
                throw new InternalServerError
            }
        }else{
            req.session.userId = user.user_id;
            returnResult.rc = 200;
            returnResult.rcmsg = coString.SUCCESS;
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
            res.status(410).json({rc: 410, rcmsg: coString.EXISTED_ID});
            return;
        }
        try {
            const salt = (await crypto.randomBytes(32)).toString('hex');
            const digest = crypto.pbkdf2Sync(secretKey, salt, 10000, 64, 'sha512').toString('base64');
            let userImg = `${process.env.SERVER_REQ_INFO}/profile/base/profile-${Math.floor(( Math.random() * 3) + 1)}.PNG`;
            const newUser = await UserSchema.createUser(userId, userName, userImg, digest, salt, t);
            req.session.userId = newUser.user_id;
            returnResult.rc = 201;
            returnResult.rcmsg = coString.CREATED;
            returnResult.userImg = newUser.profile_img;
            returnResult.userName = newUser.display_name;
            res.status(201).json(returnResult);
        } catch (error) {
            if(error.original && error.original.errno === 1062){
                throw new Conflict(coString.EXISTED_NAME);
            }
            throw new InternalServerError
        }
    })
}

const checkUserId = async(req, res) => {
    logger.info(`Checking [${req.body.userId}]...`);
    const user = await UserSchema.findOneUser(req.body.userId + ':custom');
    if(user){
        res.status(201).json({rc: 201, rcmsg: coString.EXISTED_ID});
    }else{
        res.json({rc: 200, rcmsg: coString.NOT_FOUND_USER_ID});
    }
}

const getUserInfo = async(req, res) => {
    logger.info(`Getting [${req.params.id}] information...`);
    let returnResult = {};
    const user = await UserSchema.findOneUser(req.params.id);
    if(!user){
        throw new NotFound(coString.NOT_FOUND_USER_ID);
    }
    returnResult.rc = 200;
    returnResult.rcmsg = coString.SUCCESS;
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

const changeUserName = async(req, res) => {
    logger.info(`Changing user's name of [${req.session.userId}] ...`);
    let returnResult = {};
    try {
        const [updatedCnt] = await UserSchema.updateUserName(req.session.userId, req.body.userName);
        if(!updatedCnt){
            throw new InternalServerError
        }
        returnResult.rc = 200;
        returnResult.rcmsg = coString.SUCCESS;
        returnResult.userName = req.body.userName;
        res.send(returnResult);
    } catch (error) {
        if(error.original.errno === 1062){
            throw new Conflict(coString.EXISTED_NAME);
        }
        throw new InternalServerError
    }
}

const changeUserImage = async(req, res) => {
    logger.info(`Changing user's image of [${req.session.userId}] ...`);
    let returnResult = {};
    const profileImg = process.env.SERVER_REQ_INFO + '/' + req.file.path.split(`${process.env.IMG_FILE_PATH}/`)[1];
    // TODO: sql 오류에도 파일 이미지는 정상으로 바뀜
    // TODO: 추후 서버 연결 시 경로 변경
    const [updatedCnt] = await UserSchema.updateUserImg(req.session.userId, profileImg);
    if(!updatedCnt){
        throw new InternalServerError
    }
    returnResult.rc = 200;
    returnResult.rcmsg = coString.SUCCESS;
    returnResult.profileImg = profileImg;
    res.send(returnResult);
}

const changePassword = async(req, res) => {
    logger.info(`Changing user's password of [${req.session.userId}] ...`);
    const userData = await UserSchema.findOneUser(req.session.userId);
    if(!userData){ throw new Unauthorized(coString.NOT_FOUND_USER_ID) }
    const userDigest = userData.digest;
    const digest = crypto.pbkdf2Sync(req.body.existedSecretKey, userData.salt, 10000, 64, 'sha512').toString('base64')
    if(userDigest != digest) { 
        res.status(402).json({rc: 402, rcmsg: coString.ERR_PASSWORD});
        return;
    }
    const salt = (await crypto.randomBytes(32)).toString('hex');
    const newDigest = crypto.pbkdf2Sync(req.body.newSecretKey, salt, 10000, 64, 'sha512').toString('base64')
    await UserSchema.changeUserPassword(
        req.session.userId,
        newDigest,
        salt
    );
    res.json({rc: 200, rcmsg: coString.SUCCESS});
}

const temporaryPassword = async(req, res) => {
    logger.info(`Sending user's password of [${req.body.email}] to Email...`);
    const tempPassword = Math.random().toString(36).slice(2);
    await sendEmail(req.body.email, tempPassword);
    const salt = (await crypto.randomBytes(32)).toString('hex');
    const digest = crypto.pbkdf2Sync(tempPassword, salt, 10000, 64, 'sha512').toString('base64')
    const [updatedCnt] = await UserSchema.changeUserPassword(
        req.body.email + ':custom',
        digest,
        salt
    );
    if(updatedCnt) {
        res.json({rc: 200, rcmsg: coString.SUCCESS});
    }else{
        throw new NotFound(coString.NOT_FOUND_USER_ID);
    }
}

const signOut = async(req, res) => {
    logger.info(`Signing out of [${req.session.userId}] ...`);
    req.session.destroy(function(err) {
        if(err) {
            throw new InternalServerError;
        }else{
            res.clearCookie('connect.sid');
            res.json({rc: 200, rcmsg: coString.SUCCESS});
        }
    })
}

const withdrawal = async(req, res) => {
    logger.info(`Withdrawing [${req.session.userId}] ...`);
    const userId = req.session.userId;
    const t = await sequelize.transaction(); 
    const deletedCnt = await UserSchema.deleteUser(userId, t);
    if(!deletedCnt){
        throw new InternalServerError
    }
    try {   
        await PloggingSchema.deletePloggingsModel(userId);
        // 탈퇴 유저의 산책이력 이미지 전체 삭제
        if(fs.existsSync(`${filePath}${userId}`)){
            fs.rmdirSync(`${filePath}${userId}`, { recursive: true });
        }
        // 해당 산책의 점수 랭킹점수 삭제
        await RankSchema.deleteDistance(userId);
        await RankSchema.deleteTrash(userId);
        await RankSchema.deleteScore(userId);
        req.session.destroy();
        res.clearCookie('connect.sid');
        await t.commit();
        res.json({rc: 200, rcmsg: coString.SUCCESS});
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
            url: serverUrl + '/user/password/temp'
        }})
        .then((logger.info(`${userEmail} email has been sent!`)))
}

module.exports = {
    signIn,
    social,
    register,
    checkUserId,
    getUserInfo,
    changeUserName,
    changeUserImage,
    changePassword,
    temporaryPassword,
    signOut,
    withdrawal,
    sendEmail
}
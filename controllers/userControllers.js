const nodemailer = require('nodemailer');
const Email = require('email-templates');
const logger = require("../util/logger.js")("user.js");
const fs = require('fs');
const { NotFound, Unauthorized, Conflict, InternalServerError } = require('throw.js')
const UserSchema = require('../models/user.js');
const filePath = process.env.IMG_FILE_PATH;
const adminEmailId = process.env.ADMIN_EMAIL_ID;
const adminEmailPassword = process.env.ADMIN_EMAIL_PASSWORD;
const {sequelize} = require('../models/index');
const RankSchema = require('../models/ranking');
const PloggingSchema = require('../models/plogging');
const crypto = require('crypto');
const coString = require('../util/commonString');
let timer

const signIn = async(req, res) => {
    const userId = req.body.userId + ':custom';
    let returnResult = {};
    logger.info(`Logging in with [${userId}] ...`);
    const findUserId = await UserSchema.findOneUser(userId);
    if(!findUserId){ throw new Unauthorized(coString.ERR_AUTHORIZATION) }
    if(findUserId.err_count === 4) throw new Unauthorized(coString.ERR_PASSWORD_COUNT);
    const digest = crypto.pbkdf2Sync(req.body.secretKey, findUserId.salt, 10000, 64, 'sha512').toString('base64')
    const user = await UserSchema.findOneUser(userId, digest);
    if(!user){
        await passwordErr(userId);
        clearTimeout(timer);
        timer = setTimeout(passwordErr, 1000 * 60 * 5, userId, 1);
        if(findUserId.err_count === 3) throw new Unauthorized(coString.ERR_PASSWORD_ALERT);
        else throw new Unauthorized(coString.ERR_AUTHORIZATION) 
    }
    await UserSchema.updateSignInDate(userId);
    await passwordErr(userId, 1);
    clearTimeout(timer);
    req.session.userId = userId;
    returnResult.rc = 200;
    returnResult.rcmsg = coString.SUCCESS;
    returnResult.userImg = user.profile_img;
    returnResult.userName = user.display_name;
    res.json(returnResult);
}

const social = async(req, res) => {
    let returnResult = {};
    const userId = req.body.userId;
    const userName = req.body.userName;
    logger.info(`Connecting to [${userId}] from OAuth...`);
    await sequelize.transaction(async (t) => {
        const user = await UserSchema.findOneUser(userId, t);
        if(!user){
            try {
                let userImg = 'https://i.pinimg.com/564x/d0/be/47/d0be4741e1679a119cb5f92e2bcdc27d.jpg';
                const newUser = await UserSchema.createUser(userId, userName, userImg, null, null, t);
                req.session.userId = newUser.user_id;
                returnResult.rc = 201;
                returnResult.rcmsg = coString.CREATED;
                returnResult.userImg = newUser.profile_img;
                returnResult.userName = newUser.display_name;
                res.status(201).json(returnResult);
            } catch (error) {
                if(error.original.errno === 1062){
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
        const user = await UserSchema.findOneUser(userId, t);
        if (user) {
            res.status(410).json({rc: 410, rcmsg: coString.EXISTED_ID});
        }
        try {
            // set userImg
            let userImg = 'https://i.pinimg.com/564x/d0/be/47/d0be4741e1679a119cb5f92e2bcdc27d.jpg';
            const salt = (await crypto.randomBytes(32)).toString('hex');
            const digest = crypto.pbkdf2Sync(secretKey, salt, 10000, 64, 'sha512').toString('base64');
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
        res.json({rc: 201, rcmsg: coString.EXISTED_ID});
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
    returnResult.scoreMonthly = user.score_month;
    returnResult.distanceMonthly = user.distance_month;
    returnResult.trashMonthly = user.trash_month;
    returnResult.scoreWeekly = user.score_week;
    returnResult.distanceWeekly = user.distance_week;
    returnResult.trashWeekly = user.trash_week;
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
    const profileImg = req.file.path;
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
    const findUserId = await UserSchema.findOneUser(req.session.userId);
    if(!findUserId){ throw new Unauthorized(coString.ERR_EMAIL) }
    const existedDigest = crypto.pbkdf2Sync(req.body.existedSecretKey, findUserId.salt, 10000, 64, 'sha512').toString('base64')
    const salt = (await crypto.randomBytes(32)).toString('hex');
    const digest = crypto.pbkdf2Sync(req.body.newSecretKey, salt, 10000, 64, 'sha512').toString('base64')
    const [updatedCnt] = await UserSchema.changeUserPassword(
        req.session.userId,
        digest,
        salt,
        existedDigest);
    if(updatedCnt) {
        res.json({rc: 200, rcmsg: coString.SUCCESS});
    }else{
        res.json({rc: 402, rcmsg: coString.ERR_PASSWORD});
    }
}

const temporaryPassword = async(req, res) => {
    logger.info(`Sending user's password of [${req.body.email}] to Email...`);
    const tempPassword = Math.random().toString(36).slice(2);
    await sendEmail('tempPassword', req.body.email, tempPassword);
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

const confirmPassword = async(req, res) => {
    logger.info(`Sending user's encrypt for password of [${req.body.email}] to Email...`);
    const findUserId = await UserSchema.findOneUser(req.session.userId);
    if(!findUserId){ throw new Unauthorized(coString.ERR_EMAIL) }
    await sendEmail('confirmPassword',req.body.email);
    res.json({rc: 200, rcmsg: coString.SUCCESS});
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
        if(fs.existsSync(`${filePath}/${userId}`)){
            fs.rmdirSync(`${filePath}/${userId}`, { recursive: true });
        }
        // 해당 산책의 점수 랭킹점수 삭제
        await RankSchema.delete(userId);
        res.json({rc: 200, rcmsg: coString.SUCCESS});
        res.clearCookie('connect.sid');
        req.session.destroy();
        await t.commit();
    }catch(err) {
        await t.rollback();
        throw new InternalServerError;
    }
}

const sendEmail = async(type, userEmail, tempPassword) => {
    let emailStringList = ['confirmPassword', '[Eco run] 임시 비밀번호 확인 메일입니다'];
    switch(type) {
        case 'confirmPassword':
            emailStringList = ['confirmPassword', '[Eco run] 임시 비밀번호 확인 메일입니다']
            break;
        case 'tempPassword':
            emailStringList = ['tempPassword', '[Eco run] 임시 비밀번호 입니다'];
            break;
        case 'inactiveAccount':
            emailStringList = ['inactiveAccount', '[Eco run] 휴면 계정 알림입니다.'];
            break;
        default:
    }
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
            password: tempPassword
        }})
        .then((logger.info(`${userEmail} email has been sent!`)))
}

const passwordErr = async(userId, init) => {
    await UserSchema.updateErrCount(userId, init);
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
    confirmPassword,
    signOut,
    withdrawal,
    sendEmail
}
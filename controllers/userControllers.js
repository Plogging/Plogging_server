const nodemailer = require('nodemailer');
const Email = require('email-templates');
const logger = require("../util/logger.js")("user.js");
const fs = require('fs');
const { NotFound, Unauthorized, Conflict, InternalServerError, BadRequest } = require('throw.js')
const UserSchema = require('../models/user.js');
const filePath = process.env.IMG_FILE_PATH;
const adminEmailId = process.env.ADMIN_EMAIL_ID;
const adminEmailPassword = process.env.ADMIN_EMAIL_PASSWORD;
const {sequelize} = require('../models/index');
const RankSchema = require('../models/ranking');
const PloggingSchema = require('../models/plogging');

const signIn = async(req, res) => {
    const userId = req.body.userId + ':custom';
    let returnResult = {};
    logger.info(`Logging in with [${userId}] ...`);
    const user = await UserSchema.findOneUser(userId);
    if(!user){ throw new Unauthorized }
    req.session.userId = userId;
    returnResult.rc = 200;
    returnResult.rcmsg = 'OK';
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
                const newUser = await UserSchema.createUser(userId, userName, userImg, null, t);
                req.session.userId = newUser.user_id;
                returnResult.rc = 201;
                returnResult.rcmsg = 'Created';
                returnResult.userImg = newUser.profile_img;
                returnResult.userName = newUser.display_name;
                res.status(201).json(returnResult);
            } catch (error) {
                if(error.original.errno === 1062){
                    throw new Conflict('UserName Conflict');
                }
                throw new InternalServerError
            }
        }else{
            req.session.userId = user.user_id;
            returnResult.rc = 200;
            returnResult.rcmsg = 'OK';
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
            throw new Conflict('UserId Conflict');
        }
        try {
            // set userImg
            let userImg = 'https://i.pinimg.com/564x/d0/be/47/d0be4741e1679a119cb5f92e2bcdc27d.jpg';
            const newUser = await UserSchema.createUser(userId, userName, userImg, secretKey, t);
            req.session.userId = newUser.user_id;
            returnResult.rc = 201;
            returnResult.rcmsg = 'Created';
            returnResult.userImg = newUser.profile_img;
            returnResult.userName = newUser.display_name;
            res.status(201).json(returnResult);
        } catch (error) {
            if(error.original.errno === 1062){
                throw new Conflict('UserName Conflict');
            }
            throw new InternalServerError
        }
    })
}

const checkUserId = async(req, res) => {
    logger.info(`Checking [${req.body.userId}]...`);
    const user = await UserSchema.findOneUser(req.body.userId + ':custom');
    if(user){
        throw new BadRequest('userId which was existed');
    }else{
        res.json({rc: 200, rcmsg: 'OK'});
    }
}

const getUserInfo = async(req, res) => {
    logger.info(`Getting [${req.params.id}] information...`);
    let returnResult = {};
    const user = await UserSchema.findOneUser(req.params.id);
    if(!user){
        throw new NotFound('userId which was existed');
    }
    returnResult.rc = 200;
    returnResult.rcmsg = 'OK';
    returnResult.userId = user.user_id;
    returnResult.userImg = user.profile_img;
    returnResult.userName = user.display_name;
    returnResult.userScore = user.score;
    returnResult.userDistance = user.distance;
    returnResult.userTrash = user.trash;
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
        returnResult.rcmsg = 'OK';
        returnResult.userName = req.body.userName;
        res.send(returnResult);
    } catch (error) {
        if(error.original.errno === 1062){
            throw new Conflict('UserName Conflict');
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
    returnResult.rcmsg = 'OK';
    returnResult.profileImg = profileImg;
    res.send(returnResult);
}

const changePassword = async(req, res) => {
    logger.info(`Changing user's password of [${req.session.userId}] ...`);
    const [updatedCnt] = await UserSchema.changeUserPassword(
        req.session.userId,
        req.body.newSecretKey,
        req.body.existedSecretKey);
    if(updatedCnt) {
        res.json({rc: 200, rcmsg: 'OK'});
    }else{
        throw new BadRequest('No secret key');
    }
}

const temporaryPassword = async(req, res) => {
    logger.info(`Sending user's password of [${req.body.email}] to Email...`);
    const tempPassword = Math.random().toString(36).slice(2);
    await sendEmail(req.body.email, tempPassword);
    const [updatedCnt] = await UserSchema.changeUserPassword(
        req.body.email + ':custom', tempPassword);
    if(updatedCnt) {
        res.json({rc: 200, rcmsg: 'OK'});
    }else{
        throw new NotFound('No secret key');
    }
}

const signOut = async(req, res) => {
    logger.info(`Signing out of [${req.session.userId}] ...`);
    req.session.destroy(function(err) {
        if(err) {
            throw new InternalServerError;
        }else{
            res.clearCookie('connect.sid');
            res.json({rc: 200, rcmsg: 'OK'});
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
        res.json({rc: 200, rcmsg: 'OK'});
        res.clearCookie('connect.sid');
        req.session.destroy();
        await t.commit();
    }catch(err) {
        await t.rollback();
        throw new InternalServerError;
    }
}

const sendEmail = async(userEmail, tempPassword) => {
    let emailStringList = ['signUp', '[Eco run] 회원가입을 축하합니다!'];
    if(tempPassword){
        emailStringList = ['password', '[Eco run] 임시 비밀번호 입니다'];
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
    withdrawal
}
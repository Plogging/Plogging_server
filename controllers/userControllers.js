const nodemailer = require('nodemailer');
const Email = require('email-templates');
const logger = require("../util/logger.js")("user.js");
const fs = require('fs');
const User = require('../models/users.js');
const filePath = process.env.IMG_FILE_PATH;
const adminEmailId = process.env.ADMIN_EMAIL_ID;
const adminEmailPassword = process.env.ADMIN_EMAIL_PASSWORD;
const {sequelize} = require('../models/index');
const MongoClient = require('../config/mongoConfig.js');
const RedisClient = require('../config/redisConfig.js');

const signIn = async(req, res) => {
    const userId = req.body.userId + ':custom';
    let returnResult = {};
    logger.info(`Logging in with [${userId}] ...`);
    try {
        const user = await User.findOneUser(userId);
        if(user){
            req.session.userId = userId;
            returnResult.session = req.session.id;
            returnResult.userImg = user.profile_img;
            returnResult.userName = user.display_name;
            res.json(returnResult);
        }else{
            res.sendStatus(401);
        }
    } catch (error) {
        logger.error(error.message);
        res.sendStatus(500);
    }
}

const social = async(req, res) => {
    let returnResult = {};
    const userId = req.body.userId;
    const userName = req.body.userName;
    logger.info(`Connecting to [${userId}] from OAuth...`);
    try {
        await sequelize.transaction(async (t) => {
            const user = await User.findOneUser(userId, t);
            if(!user){
                try {
                    let userImg = 'https://i.pinimg.com/564x/d0/be/47/d0be4741e1679a119cb5f92e2bcdc27d.jpg';
                    const newUser = await User.createUser(userId, userName, userImg, null, t);
                    req.session.userId = newUser.user_id;
                    returnResult.session = req.session.id;
                    returnResult.userImg = newUser.profile_img;
                    returnResult.userName = newUser.display_name;
                    res.status(201).json(returnResult);
                } catch (error) {
                    logger.error(error.message);
                    if(error.original.errno === 1062){
                        res.status(409).send('userName Conflict');
                    }else{
                        res.sendStatus(500);
                    }
                }
            }else{
                req.session.userId = user.user_id;
                returnResult.session = req.session.id;
                returnResult.userImg = user.profile_img;
                returnResult.userName = user.display_name;
                res.json(returnResult);
            }
        })
    } catch (error) {
        logger.error(error.message);
        res.sendStatus(500);
    }
}

const register = async(req, res) => {
    let returnResult = {};
    const secretKey = req.body.secretKey;
    const userName = req.body.userName;
    const userType = 'custom';
    const userId = req.body.userId + ':' + userType;
    logger.info(`Registering [${userId}] into maria DB...`);
    try {
        await sequelize.transaction(async (t) => {
            const user = await User.findOneUser(userId, t);
            if (!user) {
                try {
                    // set userImg
                    let userImg = 'https://i.pinimg.com/564x/d0/be/47/d0be4741e1679a119cb5f92e2bcdc27d.jpg';
                    const newUser = await User.createUser(userId, userName, userImg, secretKey, t);
                    req.session.userId = newUser.user_id;
                    returnResult.session = req.session.id;
                    returnResult.userImg = newUser.profile_img;
                    returnResult.userName = newUser.display_name;
                    res.status(201).json(returnResult);
                } catch (error) {
                    logger.error(error.message);
                    if(error.original.errno === 1062){
                        res.status(409).send('UserName Conflict');
                    }else{
                        res.sendStatus(500);
                    }
                }
            }else{
                logger.error(`Existed user's id for register [${req.body.userName}]`);
                res.status(409).send('UserId Conflict');
            }
        })
    } catch (error) {
        logger.error(error.message);
        res.sendStatus(500);
    }
}

const checkUserId = async(req, res) => {
    logger.info(`Checking [${req.session.userId}]...`);
    try {
        const user = await User.findOneUser(req.body.userId + ':custom');
        user? res.status(400).send('userId which was existed'): res.sendStatus(200);
    } catch (error) {
        logger.error(error.message);
        res.sendStatus(500);
    }
}

const getUserInfo = async(req, res) => {
    logger.info(`Getting [${req.params.id}] information...`);
    let returnResult = {};
    try {
        const user = await User.findOneUser(req.params.id);
        if(user){
            returnResult.userId = user.user_id;
            returnResult.userImg = user.profile_img;
            returnResult.userName = user.display_name;
            returnResult.userScore = user.score;
            returnResult.userDistance = user.distance;
            returnResult.userTrash = user.trash;
            res.json(returnResult);
        }else{
            logger.error(`No user for getting [${req.params.id}]`);
            res.status(404).send('userId which was existed');
        }
    } catch (error) {
        logger.error(error.message);
        res.sendStatus(500);
    }
}

const changeUserName = async(req, res) => {
    logger.info(`Changing user's name of [${req.session.userId}] ...`);
    let returnResult = {};
    try {
        const [updatedCnt] = await User.updateUserName(req.session.userId, req.body.userName);
        if(updatedCnt){
            returnResult.userName = req.body.userName;
            res.send(returnResult);
        }else{
            logger.error(`No user for updating name [${req.session.userId}]`);
            res.sendStatus(500);
        }
    } catch (error) {
        logger.error(error.message);
        if(error.original.errno === 1062){
            res.status(409).send('userName Conflict');
        }else{
            res.sendStatus(500);
        }
    }
}

const changeUserImage = async(req, res) => {
    logger.info(`Changing user's image of [${req.session.userId}] ...`);
    let returnResult = {};
    const profileImg = req.file.path;
    try {
        // TODO: sql 오류에도 파일 이미지는 정상으로 바뀜
        // TODO: 추후 서버 연결 시 경로 변경
        const [updatedCnt] = await User.updateUserImg(req.session.userId, profileImg);
        if(updatedCnt){
            returnResult.profileImg = profileImg;
            res.send(returnResult);
        }else{
            logger.error(`No user for updating image [${req.session.userId}]`);
            res.sendStatus(500);
        }
    } catch (error) {
        logger.error(error.message);
        res.sendStatus(500);
    }
}

const changePassword = async(req, res) => {
    logger.info(`Changing user's password of [${req.session.userId}] ...`);
    try {
        const [updatedCnt] = await User.changeUserPassword(
            req.session.userId,
            req.body.newSecretKey,
            req.body.existedSecretKey);
        updatedCnt? res.sendStatus(200): res.status(400).send('No secret key');
    } catch (error) {
        logger.error(error.message);
        res.sendStatus(500);
    }
}

const temporaryPassword = async(req, res) => {
    logger.info(`Sending user's password of [${req.body.email}] to Email...`);
    const tempPassword = Math.random().toString(36).slice(2);
    try {
        await sendEmail(req.body.email, tempPassword);
        const [updatedCnt] = await User.changeUserPassword(
            req.body.email + ':custom', tempPassword);
        updatedCnt? res.sendStatus(200): res.sendStatus(404);
    } catch (error) {
        logger.error(error.message);
        res.sendStatus(500);
    }
}

const signOut = async(req, res) => {
    logger.info(`Signing out of [${req.session.userId}] ...`);
    req.session.destroy(function(err) {
        logger.error(err);
        err? res.sendStatus(500): res.sendStatus(200);
    })
}

const withdrawal = async(req, res) => {
    logger.info(`Withdrawing [${req.session.userId}] ...`);
    const userId = req.session.userId;
    const redisClient = RedisClient;
    try {
        const t = await sequelize.transaction();
        const deletedCnt = await User.deleteUser(userId, t);
        if(deletedCnt){
            try {
                const mongoConnection = await MongoClient.connect();
                const mongoPool = mongoConnection.db('plogging');
                await mongoPool.collection('record').deleteMany({'meta.user_id': userId});
                // 탈퇴 유저의 산책이력 이미지 전체 삭제
                if(fs.existsSync(`${filePath}/${userId}`)){
                    fs.rmdirSync(`${filePath}/${userId}`, { recursive: true });
                }
                // 해당 산책의 점수 랭킹점수 삭제
                await redisClient.zrem('weekly', userId);
                await redisClient.zrem('monthly', userId);
                res.sendStatus(200);
                await t.commit();
                req.session.destroy();
            } catch (error) {
                logger.error(error.message);
                await t.rollback();
                res.sendStatus(500);
            }
        }else{
            logger.error(`No user for deleting [${userId}]`);
            res.sendStatus(500);
        }
    }catch (error) {
        logger.error(error.message);
        res.sendStatus(500);
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
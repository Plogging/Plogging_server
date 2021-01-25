const express = require('express');
const cors=require('cors');
const USER_TABLE = 'user';
const fs = require('fs');
const filePath = process.env.IMG_FILE_PATH;
const adminEmailId = process.env.ADMIN_EMAIL_ID;
const adminEmailPassword = process.env.ADMIN_EMAIL_PASSWORD;
const swaggerValidation = require('../util/validator');
const nodemailer = require('nodemailer');
const Email = require('email-templates');
const logger = require("../util/logger.js")("user.js");


const UserInterface = function(config) {
    const router = express.Router();
    
    router.all('*'  ,cors());
    this.router = router;
    this.redisClient = config.redisClient;
    this.fileInterface = config.fileInterface;
    this.MongoPool = config.MongoPool;
    this.User = config.sequelize.models.user;
    this.sequelize = config.sequelize;

    const upload = this.fileInterface({
        storage: this.fileInterface.diskStorage({
            destination: function (req, file, cb) {
                const userId = req.userId; // 세션체크 완료하면 값 받아옴
                const dir = `${filePath}/${userId}`;
                if (!fs.existsSync(dir)){
                    fs.mkdirSync(dir);
                }
                cb(null, dir);
            },
            filename: function (req, file, cb) {
                cb(null, `profileImg.PNG`);
            }
        }),
        limits: {fileSize: 1*1000*5000}, // file upload 5MB 제한
        })

    // 유저 관련 api 구현
    router.post('/sign-in', swaggerValidation.validate, (req, res) => this.signIn(req, res));
    router.post('/social', swaggerValidation.validate, (req, res) => this.social(req, res));
    router.post('', swaggerValidation.validate, (req, res) => this.register(req, res));
    router.post('/check', swaggerValidation.validate, (req, res) => this.checkUserId(req, res));
    router.get('/:id', swaggerValidation.validate, (req, res) => this.getUserInfo(req, res));
    router.put('/name', swaggerValidation.validate, (req, res) => this.changeUserName(req, res));
    router.put('/image', upload.single('profileImg'), swaggerValidation.validate, (req, res) => this.changeUserImage(req, res));
    router.put('/password', swaggerValidation.validate, (req, res) => this.changePassword(req, res));
    router.put('/password-temp', swaggerValidation.validate, (req, res) => this.temporaryPassword(req, res));
    router.get('/sign-out', swaggerValidation.validate, (req, res) => this.signOut(req, res));
    router.delete('', swaggerValidation.validate, (req, res) => this.withdrawal(req, res));
        
    return this.router;
};

UserInterface.prototype.signIn = async function(req, res) {
    const userId = req.body.userId + ':custom';
    let returnResult = {};
    logger.info(`Logging in with [${userId}] ...`);
    try {
        const user = await this.User.findOne({ where: {user_id: userId}});
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

UserInterface.prototype.social = async function(req, res) {
    let returnResult = {};
    const userId = req.body.userId;
    const [userEmail, userType] = req.body.userId.split(':');
    const userName = req.body.userName;
    logger.info(`Connecting to [${userId}] from OAuth...`);
    try {
        await this.sequelize.transaction(async (t) => {
            const user = await this.User.findOne({ 
                where: {user_id: userId}
            }, {transaction: t});
            if(!user){
                try {
                    let userImg = 'https://i.pinimg.com/564x/d0/be/47/d0be4741e1679a119cb5f92e2bcdc27d.jpg';
                    const newUser = await this.User.create({
                        user_id: userId,
                        display_name: userName,
                        profile_img: userImg,
                        type: userType,
                        email: userEmail
                    }, {transaction: t})
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

UserInterface.prototype.register = async function(req, res) {
    let returnResult = {};
    const secretKey = req.body.secretKey;
    const userName = req.body.userName;
    const userType = 'custom';
    const userId = req.body.userId + ':' + userType;
    logger.info(`Registering [${userId}] into maria DB...`);
    try {
        await this.sequelize.transaction(async (t) => {
            const user = await this.User.findOne({ 
                where: {user_id: userId}
            },{ transaction: t});
            if (!user) {
                try {
                    // set userImg
                    let userImg = 'https://i.pinimg.com/564x/d0/be/47/d0be4741e1679a119cb5f92e2bcdc27d.jpg';
                    const newUser = await this.User.create({
                        user_id: userId,
                        display_name: userName, 
                        profile_img: userImg, 
                        type: userType, 
                        email: req.body.userId,
                        secret_key: secretKey 
                    },{ transaction: t});
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

UserInterface.prototype.checkUserId = async function(req, res) {
    logger.info(`Checking [${req.session.userId}]...`);
    try {
        const updatedCnt = await this.User.findOne({
            where: {user_id: req.body.userId + ':custom'}
        })
        updatedCnt? res.status(400).send('userId which was existed'): res.sendStatus(200);
    } catch (error) {
        logger.error(error.message);
        res.sendStatus(500);
    }
}

UserInterface.prototype.getUserInfo = async function(req, res) {
    logger.info(`Getting [${req.params.id}] information...`);
    let returnResult = {};
    try {
        const user = await this.User.findOne({ where: { user_id: req.params.id}});
        if(user){
            returnResult.userId = user.user_id;
            returnResult.userImg = user.profile_img;
            returnResult.userName = user.display_name;
            returnResult.userScore = user.score;
            returnResult.userDistance = user.distance;
            returnResult.userTrash = user.trash;
            res.json(returnResult);
        }else{
            logger.error(`No user for getting [${userId}]`);
            res.sendStatus(500);
        }
    } catch (error) {
        logger.error(error.message);
        res.sendStatus(500);
    }
}

UserInterface.prototype.changeUserName = async function(req, res) {
    logger.info(`Changing user's name of [${req.session.userId}] ...`);
    let returnResult = {};
    try {
        const [updatedCnt] = await this.User.update({
            display_name: req.body.userName
        }, { where: { user_id: req.session.userId}});
        if(updatedCnt){
            returnResult.userName = req.body.userName;
            res.send(returnResult);
        }else{
            logger.error(`No user for updating name [${userId}]`);
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

UserInterface.prototype.changeUserImage = async function(req, res) {
    logger.info(`Changing user's image of [${req.session.userId}] ...`);
    let returnResult = {};
    const profileImg = req.file.path;
    try {
        // TODO: sql 오류에도 파일 이미지는 정상으로 바뀜
        // TODO: 추후 서버 연결 시 경로 변경
        const [updatedCnt] = await this.User.update({
            profile_img: profileImg,
        }, { where: { user_id: req.session.userId}});
        if(updatedCnt){
            returnResult.profileImg = profileImg;
            res.send(returnResult);
        }else{
            logger.error(`No user for updating image [${userId}]`);
            res.sendStatus(500);
        }
    } catch (error) {
        logger.error(error.message)
        res.sendStatus(500);
    }
}

UserInterface.prototype.changePassword = async function(req, res) {
    logger.info(`Changing user's password of [${req.session.userId}] ...`);
    try {
        const [updatedCnt] = await this.User.update({
            secret_key: req.body.newSecretKey
        }, { where: {
            user_id: req.session.userId,
            secret_key: req.body.existedSecretKey
        }});
        updatedCnt? res.sendStatus(200): res.status(400).send('No secret key');
    } catch (error) {
        logger.error(error.message);
        res.sendStatus(500);
    }
}

UserInterface.prototype.temporaryPassword = async function(req, res) {
    logger.info(`Sending user's password of [${req.session.userId}] to Email...`);
    const tempPassword = Math.random().toString(36).slice(2);
    try {
        await sendEmail(req.body.email, tempPassword);
        const [updatedCnt] = await this.User.update({
            secret_key: tempPassword
        }, { where: { user_id: req.session.userId}});
        updatedCnt? res.sendStatus(200): res.sendStatus(404);
    } catch (error) {
        logger.error(error.message);
        res.sendStatus(500);
    }
}

UserInterface.prototype.signOut = async function(req, res) {
    logger.info(`Signing out of [${req.session.userId}] ...`);
    req.session.destroy(function(err) {
        logger.error(err)
        err? res.sendStatus(500): res.sendStatus(200);
    })
}

UserInterface.prototype.withdrawal = async function(req, res) {
    logger.info(`Withdrawing [${req.session.userId}] ...`);
    const userId = req.session.userId;
    const mongoConnection = this.MongoPool.db('plogging');
    const redisClient = this.redisClient;
    try {
        const t = await this.sequelize.transaction();
        const deletedCnt = await this.User.destroy({
            where: {user_id: userId}
        }, { transaction: t});
        if(deletedCnt){
            try {
                await mongoConnection.collection('record').deleteMany({'meta.user_id': userId});
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



const sendEmail = async function(userEmail, tempPassword){
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
        .then(() => logger.info(`${userEmail} email has been sent!`))
        .catch(logger.error(err.message));
}

module.exports = UserInterface;
module.exports.USER_TABLE = USER_TABLE;

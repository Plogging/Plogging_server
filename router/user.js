const express = require('express');
const cors=require('cors');
const util = require('../util/common.js');
const USER_TABLE = 'user';
const fs = require('fs');
const filePath = process.env.IMG_FILE_PATH;
const adminEmailId = process.env.ADMIN_EMAIL_ID;
const adminEmailPassword = process.env.ADMIN_EMAIL_PASSWORD;
const swaggerValidation = require('../util/validator');
const nodemailer = require("nodemailer");
const Email = require('email-templates');

const UserInterface = function(config) {
    const router = express.Router();
    
    router.all('*'  ,cors());
    this.router = router;
    this.mysqlPool = config.mysqlPool;
    this.pool = config.mysqlPool2;
    this.redisClient = config.redisClient;
    this.fileInterface = config.fileInterface;
    this.MongoPool = config.MongoPool;

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
    router.post('', swaggerValidation.validate, (req, res) => this.register(req, res));
    router.get('', swaggerValidation.validate, (req, res) => this.getUserInfo(req, res));
    router.post('/sign-in', swaggerValidation.validate, (req, res) => this.signIn(req, res));
    router.get('/sign-out', swaggerValidation.validate, (req, res) => this.signOut(req, res));
    router.put('/password', swaggerValidation.validate, (req, res) => this.changePassword(req, res));
    router.put('/password-temp', swaggerValidation.validate, (req, res) => this.temporaryPassword(req, res));
    router.put('', upload.single('profileImg'), swaggerValidation.validate, (req, res) => this.changeUserProfile(req, res));
    router.delete('', swaggerValidation.validate, (req, res) => this.withdrawal(req, res));
    return this.router;
};

UserInterface.prototype.register = async function(req, res) {
    let returnResult = {};
    const [userEmail, userType] = req.body.userId.split(":");
    const secretKey = req.body.secretKey;
    const userName = req.body.userName;
    const userId = req.body.userId;
    
    if(userType.toLowerCase() != 'custom' || !secretKey){ 
        res.sendStatus(400);
        return;
    }
    const findUserQuery = `SELECT * FROM ${USER_TABLE} WHERE user_id = ?`;
    const findUserValues = [userId];
    const promiseConn = await this.pool.promise().getConnection();
    promiseConn.beginTransaction();
    const [rows, _] = await promiseConn.execute(findUserQuery, findUserValues);
    if (rows.length === 0) {
        try {
            // set userImg
            let userImg = "https://i.pinimg.com/564x/d0/be/47/d0be4741e1679a119cb5f92e2bcdc27d.jpg";
            const createDateline = util.getCurrentDateTime();
            const createUserQuery = `INSERT INTO ${USER_TABLE}(user_id, display_name, profile_img, type, email, update_datetime, create_datetime, secret_key) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`;
            const createUserValues = [userId, userName, userImg, userType, userEmail, createDateline, createDateline, secretKey];
            await promiseConn.execute(createUserQuery, createUserValues);
            req.session.userId = userId;
            returnResult.session = req.session.id;
            returnResult.userImg = userImg;
            returnResult.userName = userName;
            res.status(201).json(returnResult);
            promiseConn.commit();
        } catch (error) {
            if(error.errno === 1062){
                res.status(409).send('DisplayName Conflict');
            }else{
                res.sendStatus(500);
            }
            promiseConn.rollback();
        }
    }else{
        res.status(409).send('UserId Conflict');
    };
    promiseConn.release();
}

UserInterface.prototype.signIn = async function(req, res) {
    let returnResult = {};
    const [userEmail, userType] = req.body.userId.split(":");
    const secretKey = req.body.secretKey;
    const userName = req.body.userName;
    const userId = req.body.userId;
    if(userType.toLowerCase() === 'custom' && !secretKey){ 
        res.sendStatus(400);
        return;
    }
    const promiseConn = await this.pool.promise().getConnection();
    promiseConn.beginTransaction();
    // search userId in DB
    const findUserQuery = `SELECT * FROM ${USER_TABLE} WHERE user_id = ?`;
    const findUserValues = [userId];
    const [rows, _] = await promiseConn.execute(findUserQuery, findUserValues);
    if (rows.length === 0) {
        if(userType.toLowerCase() === 'custom'){
            res.sendStatus(404);
            return;
        }
        try {
            // set userImg
            let userImg = "https://i.pinimg.com/564x/d0/be/47/d0be4741e1679a119cb5f92e2bcdc27d.jpg";
            const createDateline = util.getCurrentDateTime();
            const createUserQuery = `INSERT INTO ${USER_TABLE}(user_id, display_name, profile_img, type, email, update_datetime, create_datetime) VALUES(?, ?, ?, ?, ?, ?, ?)`;
            const createUserValues = [userId, userName, userImg, userType, userEmail, createDateline, createDateline];
            await promiseConn.execute(createUserQuery, createUserValues);
            req.session.userId = userId;
            returnResult.session = req.session.id;
            returnResult.userImg = userImg;
            returnResult.userName = userName;
            res.status(201).json(returnResult);
            promiseConn.commit();
        } catch (error) {
            if(error.errno === 1062){
                res.sendStatus(409);
            }else{
                res.sendStatus(500);
            }
            promiseConn.rollback();
        }
    }else{
        if(userType.toLowerCase() === 'custom'){
            if(secretKey != rows[0].secret_key){
                res.sendStatus(401);
                promiseConn.rollback();
                return;
            }
        }
        req.session.userId = userId;
        returnResult.session = req.session.id;
        returnResult.userImg = rows[0].profile_img;
        returnResult.userName = rows[0].display_name;
        res.json(returnResult);
        promiseConn.commit();
    };
    promiseConn.release();
}

UserInterface.prototype.getUserInfo = async function(req, res) {
    const promisePool = this.pool.promise();
    let returnResult = {};
    try {
        const getUserQuery = `SELECT * FROM ${USER_TABLE} WHERE user_id = ?`;
        const getUserValues = [req.session.userId];
        const [rows, _] = await promisePool.execute(getUserQuery, getUserValues);
        if(rows.length){
            returnResult.userId = rows[0].user_id;
            returnResult.userImg = rows[0].profile_img;
            returnResult.userName = rows[0].display_name;
            res.json(returnResult);
        }else{
            res.sendStatus(500);
        }
    } catch (error) {
        res.sendStatus(500);
    }
}

UserInterface.prototype.changeUserProfile = async function(req, res) {
    const promisePool = this.pool.promise();
    let returnResult = {};
    const updateTime = util.getCurrentDateTime();
    try {
        // TODO: sql 오류에도 파일 이미지는 정상으로 바뀜
        const profileImg = req.file.path; // TODO: 추후 서버 연결 시 경로 변경
        const query = `UPDATE ${USER_TABLE} SET profile_img = ?, update_datetime = ? WHERE user_id = ?`;
        const values = [profileImg, updateTime, req.session.userId];
        const [rows, _] = await promisePool.execute(query, values);
        if(rows.affectedRows){
            returnResult.profileImg = profileImg;
            res.send(returnResult);
        }else{
            res.sendStatus(500);
        }
    } catch (error) {
        res.sendStatus(500);
    }
}

UserInterface.prototype.signOut = async function(req, res) {
    req.session.destroy(function(err) {
        if(err) {
            res.sendStatus(500);
        }else {
            res.sendStatus(200);
        }
    })
}

UserInterface.prototype.withdrawal = async function(req, res) {
    const userId = req.session.userId;
    const mongoConnection = this.MongoPool.db('plogging');
    const redisClient = this.redisClient;
    const promiseConn = await this.pool.promise().getConnection();
    promiseConn.beginTransaction();
    const deleteUserQuery = `DELETE FROM ${USER_TABLE} WHERE user_id = ?`;
    const deleteUserValues = [userId];
    const [rows,_] = await promiseConn.query(deleteUserQuery, deleteUserValues)
    if(rows.affectedRows){
        try {
            await mongoConnection.collection('record').deleteMany({"meta.user_id": userId});
            // 탈퇴 유저의 산책이력 이미지 전체 삭제
            if(fs.existsSync(`${filePath}/${userId}`)){
                fs.rmdirSync(`${filePath}/${userId}`, { recursive: true });
            }
            // 해당 산책의 점수 랭킹점수 삭제
            await redisClient.zrem("weekly", userId);
            await redisClient.zrem("monthly", userId);
            res.sendStatus(200);
            req.session.destroy();
            promiseConn.commit();
        } catch (error) {
            console.log(error.message)
            res.sendStatus(500);
            promiseConn.rollback();
        }
    }
    promiseConn.release();
}

UserInterface.prototype.changePassword = async function(req, res) {
    try {
        const promisePool = this.pool.promise();
        const query = `UPDATE ${USER_TABLE} SET secret_key = ? WHERE user_id = ? AND secret_key = ?`;
        const value = [req.body.newSecretKey, req.session.userId, req.body.existedSecretKey];
        const [rows, _] = await promisePool.execute(query, value);
        if(rows.affectedRows){
            res.sendStatus(200);
        }else{
            res.status(400).send('No secret key');
        }
    } catch (error) {
        res.sendStatus(500);
    }
}

UserInterface.prototype.temporaryPassword = async function(req, res) {
    const tempPassword = Math.random().toString(36).slice(2);
    try {
        await sendEmail(req.body.email, tempPassword);
        const promisePool = this.pool.promise();
        const query = `UPDATE ${USER_TABLE} SET secret_key = ? WHERE user_id = ?`;
        const value = [tempPassword, req.body.email+":custom"];
        const [rows, _] = await promisePool.execute(query, value);
        if(rows.affectedRows){
            res.sendStatus(200);
        }else{
            res.sendStatus(404);
        }
    } catch (error) {
        res.sendStatus(500);
    }
}

const sendEmail = async function(userEmail, tempPassword){
    let emailStringList = ['signUp', '[Eco run] 회원가입을 축하합니다!']
    if(tempPassword){
        emailStringList = ['password', '[Eco run] 임시 비밀번호 입니다']
    }
    let transporter = nodemailer.createTransport({
        service: "gmail",
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
            from: "Eco run<ploggingteam@gmail.com>", 
            to: userEmail, 
            subject: emailStringList[1]
        },
        locals: {
            name: userEmail,
            password: tempPassword
        }})
        .then(() => console.log('email has been sent!'))
        .catch(console.error);

}

module.exports = UserInterface;
module.exports.USER_TABLE = USER_TABLE;

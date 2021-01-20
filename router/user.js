const express = require('express');
const cors=require('cors');
const util = require('../util/common.js');
const USER_TABLE = 'user';
const fs = require('fs');
const { uptime } = require('process');
const { assert } = require('console');
const filePath = process.env.IMG_FILE_PATH;
const swaggerValidation = require('../util/validator');
const { reloadLogs } = require('pm2');

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
    router.post('', swaggerValidation.validate, (req, res) => this.signIn(req, res));
    router.get('', swaggerValidation.validate, (req, res) => this.getUserInfo(req, res));
    router.get('/sign-out', swaggerValidation.validate, (req, res) => this.signOut(req, res));
    router.put('', upload.single('profileImg'), swaggerValidation.validate, (req, res) => this.update(req, res));
    router.delete('', swaggerValidation.validate, (req, res) => this.withdrawal(req, res));
    return this.router;
};

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
    
    // search userId in DB
    this.pool.getConnection(async function(err, conn){
        conn.beginTransaction();
        const findUserQuery = `SELECT * FROM ${USER_TABLE} WHERE user_id = ?`;
        const findUserValues = [userId];
        const [rows, _] = await conn.promise().execute(findUserQuery, findUserValues); 
        if (rows.length === 0) {
            try {
                // set userImg
                let userImg = "https://i.pinimg.com/564x/d0/be/47/d0be4741e1679a119cb5f92e2bcdc27d.jpg";
                const createDateline = util.getCurrentDateTime();
                let createUserQuery
                let createUserValues
                if(userType.toLowerCase() === 'custom'){
                    createUserQuery = `INSERT INTO ${USER_TABLE}(user_id, display_name, profile_img, type, email, update_datetime, create_datetime, secret_key) VALUES(?, ?, ?, ?, ?, ?, ?, ?)`;
                    createUserValues = [userId, userName, userImg, userType, userEmail, createDateline, createDateline, secretKey];
                }else{
                    createUserQuery = `INSERT INTO ${USER_TABLE}(user_id, display_name, profile_img, type, email, update_datetime, create_datetime) VALUES(?, ?, ?, ?, ?, ?, ?)`;
                    createUserValues = [userId, userName, userImg, userType, userEmail, createDateline, createDateline];
                }
                await conn.promise().execute(createUserQuery, createUserValues);
                req.session.userId = userId;
                returnResult.session = req.session.id;
                returnResult.userImg = userImg;
                returnResult.userName = userName;
                res.status(201).json(returnResult);
                conn.commit();
            } catch (error) {
                if(error.errno === 1062){
                    res.sendStatus(409);
                }else{
                    res.sendStatus(500);
                }
                conn.rollback();
            }
        }else{
            if(userType.toLowerCase() === 'custom'){
                if(secretKey != rows[0].secret_key){
                    res.sendStatus(401);
                    conn.rollback();
                    return;
                }
            }
            req.session.userId = userId;
            returnResult.session = req.session.id;
            returnResult.userImg = rows[0].profile_img;
            returnResult.userName = rows[0].display_name;
            res.json(returnResult);
            conn.commit();
        };
        if(err){
            res.sendStatus(500);
        };
        conn.release();
    });
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

UserInterface.prototype.update = async function(req, res) {
    const promisePool = this.pool.promise();
    let returnResult = {};
    const displayName = req.body.displayName;
    const currentTime = util.getCurrentDateTime();
    try {
        // TODO: sql 오류에도 파일 이미지는 정상으로 바뀜
        const profileImg = req.file.path; // TODO: 추후 서버 연결 시 경로 변경
        const updateUserQuery = `UPDATE ${USER_TABLE} SET display_name = ?, profile_img = ?, update_datetime = ? WHERE user_id = ?`;
        const updateUserValues = [displayName, profileImg, currentTime, req.session.userId];
        const [rows, _] = await promisePool.execute(updateUserQuery, updateUserValues);
        if(rows.affectedRows){
            returnResult.displayName = displayName;
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
    const redisClient = this.redisClient
    this.pool.getConnection( async function(err, conn){
        conn.beginTransaction();
        const deleteUserQuery = `DELETE FROM ${USER_TABLE} WHERE user_id = ?`;
        const deleteUserValues = [userId];
        const [rows,_] = await conn.promise().query(deleteUserQuery, deleteUserValues)
        if(rows.affectedRows){
            try {
                await mongoConnection.collection('record').deleteMany({"meta.user_id": userId});
                // 탈퇴 유저의 산책이력 이미지 전체 삭제
                if(fs.existsSync(`${filePath}/${userId}`)){
                    removeDir(`${filePath}/${userId}`);
                }
                // 해당 산책의 점수 랭킹점수 삭제
                await redisClient.zrem("weekly", userId);
                await redisClient.zrem("monthly", userId);

                res.sendStatus(200);
                req.session.destroy();
                conn.commit();
            } catch (error) {
                console.log(error.message)
                res.sendStatus(500);
                conn.rollback();
            }
        }
        if(err){
            res.sendStatus(500);
        };
        conn.release();
    });
}

const removeDir = function(path) {
    if (fs.existsSync(path)) {
        const files = fs.readdirSync(path)
        if (files.length > 0) {
            files.forEach(function(filename) {
                if (fs.statSync(path + "/" + filename).isDirectory()) {
                removeDir(path + "/" + filename)
                } else {
                fs.unlinkSync(path + "/" + filename)
                }
            })
        fs.rmdirSync(path)
        } else {
        fs.rmdirSync(path)
        }
    } else {
        console.log("Directory path not found.")
    }
}

module.exports = UserInterface;
module.exports.USER_TABLE = USER_TABLE;

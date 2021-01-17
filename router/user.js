const express = require('express');
const cors=require('cors');
const util = require('../util/common.js');
const USER_TABLE = 'user';
const fs = require('fs');
const { uptime } = require('process');
const crypto = require('crypto');
const { assert } = require('console');
const filePath = process.env.IMG_FILE_PATH;

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
            const userId = req.body.userId; // 세션체크 완료하면 값 받아옴
            const dir = `${filePath}${userId}`;
                
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            cb(null, dir);
            },
            filename: function (req, file, cb) {
            cb(null, `flogging_${util.getCurrentDateTime()}.PNG`);
            }
        }),
        limits: {fileSize: 1*1000*5000}, // file upload 5MB 제한
        })

    // 유저 관련 api 구현
    router.post('', (req, res) => this.signIn(req, res));
    router.get('', (req, res) => this.getUserInfo(req, res));
    router.get('/sign-out', (req, res) => this.signOut(req, res));
    router.put('', upload.single('profile_img'), (req, res) => this.update(req, res));
    router.delete('', (req, res) => this.withdrawal(req, res));
    return this.router;
};

/**
 * @swagger
 * /user:
 *   post:
 *     summary: 로그인 하기
 *     tags: [User]
 *     parameters:
 *       - in: body
 *         name: user
 *         description: userId는 email:type 으로 구분자 ':'를 사용합니다. 자체 로그인인 경우는 custom으로 하면됩니다. 자체로그인인 경우는 secretKey를 꼭 받아야 합니다.
 *         schema:
 *              type: object
 *              required:
 *                - userName
 *                - userId
 *              properties:
 *                userId:
 *                  type: string
 *                  example: ganghee@naver.com:naver.com
 *                userName:
 *                  type: string
 *                  example: 쓰담이
 *                secretKey:
 *                  type: string
 *                  example: 1234qwer
 *     responses:
 *       200:
 *         description: 신입 회원인 경우에 Success creating user 기존 회원인 경우에 Success getting user
 *         schema:
 *          type: object
 *          properties:
 *              rc:
 *                  type: number
 *                  example: 200
 *              rcmsg:
 *                  type: string
 *                  example: Success create user
 *              session:
 *                  type: string
 *                  example: 0q8DptSJiinhbspcQwK6wxUtvNkmNano
 *              userImg:
 *                  type: string
 *                  example: https://i.pinimg.com/564x/d0/be/47/d0be4741e1679a119cb5f92e2bcdc27d.jpg
 *              userName:
 *                  type: string
 *                  example: 쓰담이
 *    
 *       400:
 *         description: Bad Request(parameter error)
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 400
 *                 rcmsg:
 *                     type: string
 *                     example: no parameter
 *       401:
 *         description: Bad Request(password error)
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 401
 *                 rcmsg:
 *                     type: string
 *                     example: password error
 *       500:
 *         description: server error
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 500
 *                 rcmsg:
 *                     type: string
 *                     example: server error
 *       600:
 *         description: DB error
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 600
 *                 rcmsg:
 *                     type: string
 *                     example: DB error
 */

UserInterface.prototype.signIn = async function(req, res) {

    let returnResult = { rc: 500, rcmsg: "server error" };
    const secretKey = req.body.secretKey;
    const [userEmail, userType] = req.body.userId.split(":");
    const userName = req.body.userName;

    // case no parameter
    if(!userEmail || !userType) {
        returnResult.rc = 400;
        returnResult.rcmsg = "no parameter";
        res.status(400).send(returnResult);
        return;
    }
    if(userType.toLowerCase() === 'custom' && !secretKey){
        returnResult.rc = 400;
        returnResult.rcmsg = "no parameter";
        res.status(400).send(returnResult);
        return;
    }
    
    // search userId in DB
    const userId = req.body.userId
    const findUserQuery = `SELECT * FROM ${USER_TABLE} WHERE user_id = ?`;
    const findUserValues = [userId];

    this.pool.getConnection(function(err, conn){
        conn.beginTransaction();
        conn.execute(findUserQuery, findUserValues, function(err, result) {
            
            if (result.length === 0) {
                
                // set userImg
                let userImg = "https://i.pinimg.com/564x/d0/be/47/d0be4741e1679a119cb5f92e2bcdc27d.jpg";
                const createDateline = util.getCurrentDateTime();
                let createUserQuery
                let createUserValues
                if(userType.toLowerCase() === 'custom'){
                    const salt = (crypto.randomBytes(32)).toString('hex');
                    const hashedPassword = crypto.pbkdf2Sync(secretKey, salt, 10000, 64, 'sha512').toString('base64');
                    createUserQuery = `INSERT INTO ${USER_TABLE}(user_id, display_name, profile_img, type, email, update_datetime, create_datetime, salt, hash_password) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                    createUserValues = [userId, userName, userImg, userType, userEmail, createDateline, createDateline, salt, hashedPassword];
                }else{
                    createUserQuery = `INSERT INTO ${USER_TABLE}(user_id, display_name, profile_img, type, email, update_datetime, create_datetime) VALUES(?, ?, ?, ?, ?, ?, ?)`;
                    createUserValues = [userId, userName, userImg, userType, userEmail, createDateline, createDateline];
                }
                
                conn.execute(createUserQuery, createUserValues, function(err, result){
                    if(err) {
                        returnResult.rc = 600;
                        returnResult.rcmsg = err.message;
                        res.send(returnResult);
                        conn.rollback();
                    }else{
                        req.session.userId = userId;
                        returnResult.rc = 200;
                        returnResult.rcmsg = "Success creating user";
                        returnResult.session = req.session.id;
                        returnResult.userImg = userImg;
                        returnResult.userName = userName;
                        res.send(returnResult);
                        conn.commit();
                    }
                });
                if(err) {
                    returnResult.rc = 600;
                    returnResult.rcmsg = err.message;
                    res.send(returnResult);
                    conn.rollback();
                }
            }else{
                if(userType.toLowerCase() === 'custom'){
                    const hashedPassword = crypto.pbkdf2Sync(secretKey, result[0].salt, 10000, 64, 'sha512').toString('base64');
                    if(hashedPassword != result[0].hash_password){
                        returnResult.rc = 401;
                        returnResult.rcmsg = "password error";
                        res.send(returnResult);
                        conn.rollback();
                        return;
                    }
                }
                req.session.userId = userId
                returnResult.rc = 200;
                returnResult.rcmsg = "Success getting user";
                returnResult.session = req.session.id;
                returnResult.userImg = result[0].profile_img;
                returnResult.userName = result[0].display_name;
                res.send(returnResult);
                conn.commit();
            };
        });
        if(err){
            returnResult.rc = 600;
            returnResult.rcmsg = err.message;
            res.send(returnResult);
            conn.rollback();
        }
        conn.release();
    });
}

/**
 * @swagger
 * /user:
 *   get:
 *     summary: 사용자 정보 가져오기
 *     description: 사용자 id(email + type), 사용자 닉네임, 프로필 사진을 가져온다.
 *     tags: [User]
 *     parameters:
 *       - in: header
 *         name: userId
 *         type: string
 *         required: true
 *         description: 유저 SessionKey
 *     responses:
 *       200:
 *         description: 2개의 파라미터를 받아 성공적으로 변경
 *         schema:
 *          type: object
 *          properties:
 *              rc:
 *                  type: number
 *                  example: 200
 *              rcmsg:
 *                  type: string
 *                  example: success
 *              userId:
 *                  type: string
 *                  example: abc@naver.com:naver.com
 *              userImg:
 *                  type: string
 *                  example: https://i.pinimg.com/564x/d0/be/47/d0be4741e1679a119cb5f92e2bcdc27d.jpg
 *              userName:
 *                  type: string
 *                  example: 쓰담이
 *     
 *       400:
 *         description: Bad Request(parameter error)
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 400
 *                 rcmsg:
 *                     type: string
 *                     example: no parameter
 *       401:
 *         description: Bad Request(session key error)
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 401
 *                 rcmsg:
 *                     type: string
 *                     example: no header key
 *       500:
 *         description: server error
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 500
 *                 rcmsg:
 *                     type: string
 *                     example: Getting user error
 *       600:
 *         description: DB error
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 600
 *                 rcmsg:
 *                     type: string
 *                     example: DB error
 */

UserInterface.prototype.getUserInfo = async function(req, res) {
    
    const pool = this.pool;
    let returnResult = { rc: 200, rcmsg: 'success' };
    console.log(req.session.userId);
    if(!req.session){
        returnResult.rc = 401;
        returnResult.rcmsg = "no header key"
        return;
    }
    try {
        const getUserQuery = `SELECT * FROM ${USER_TABLE} WHERE user_id = ?`;
        const getUserValues = [req.session.userId];
        
        pool.execute(getUserQuery, getUserValues, function(err, result) {
            console.log(result);
            if(result.length){
                returnResult.rc = 200;
                returnResult.rcmsg = 'success';
                returnResult.userId = result[0].user_id;
                returnResult.userImg = result[0].profile_img;
                returnResult.userName = result[0].display_name;
                res.send(returnResult);
            }else{
                returnResult.rc = 500;
                returnResult.rcmsg = 'Getting user error';
                res.send(returnResult);
            }
            if(err){
                returnResult.rc = 600;
                returnResult.rcmsg = err.message;
                res.send(returnResult);
            }
        })
    } catch (error) {
        returnResult.rc = 500;
        returnResult.rcmsg = error.message;
        res.send(returnResult);
    }
}

/**
 * @swagger
 * /user:
 *   put:
 *     summary: 사용자 정보변경
 *     description: 반드시 2개의 파라미터를 받아야한다. 
 *     tags: [User]
 *     parameters:
 *       - in: header
 *         name: userId
 *         type: string
 *         required: true
 *         description: 유저 SessionKey
 *       - in: formData
 *         name: profile_img
 *         type: file
 *         description: 사용자의 사진을 업로드 합니다.
 *         required: true
 *       - in: formData
 *         name: display_name
 *         type: string
 *         description: 사용자의 이름을 변경합니다.
 *         required: true
 *     responses:
 *       200:
 *         description: 2개의 파라미터를 받아 성공적으로 변경
 *         schema:
 *          type: object
 *          properties:
 *              rc:
 *                  type: number
 *                  example: 200
 *              rcmsg:
 *                  type: string
 *                  example: success
 *              userImg:
 *                  type: string
 *                  example: https://i.pinimg.com/564x/d0/be/47/d0be4741e1679a119cb5f92e2bcdc27d.jpg
 *              userName:
 *                  type: string
 *                  example: 쓰담이
 *    
 *       400:
 *         description: Bad Request(parameter error)
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 400
 *                 rcmsg:
 *                     type: string
 *                     example: no parameter
 *       401:
 *         description: Bad Request(session key error)
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 401
 *                 rcmsg:
 *                     type: string
 *                     example: no header key
 *       500:
 *         description: user update error
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 500
 *                 rcmsg:
 *                     type: string
 *                     example: user update error
 *       600:
 *         description: DB error
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 600
 *                 rcmsg:
 *                     type: string
 *                     example: DB error
 */

UserInterface.prototype.update = async function(req, res) {
    
    const pool = this.pool;
    let returnResult = { rc: 200, rcmsg: "success" };
    const user = req.body;
    const currentTime = util.getCurrentDateTime();
    if(!req.session){
        returnResult.rc = 401;
        returnResult.rcmsg = "no header key"
        return;
    }
    try {
        if(!user.display_name || !req.file) {
            returnResult.rc = 400;
            returnResult.rcmsg = "no parameter";
            res.status(400).send(returnResult);
            return;
        }else{
            const profileImg = req.file.path
            const updateUserQuery = `UPDATE ${USER_TABLE} SET display_name = ?, profile_img = ?, update_datetime = ? WHERE user_id = ?`
            const updateUserValues = [user.display_name, profileImg, currentTime, req.session.userId];
            
            pool.execute(updateUserQuery, updateUserValues, function(err, result) {
                if(result.affectedRows){
                    returnResult.rc = 200;
                    returnResult.rcmsg = "Success user updated";
                    returnResult.displayName = user.display_name;
                    returnResult.profile_img = profileImg;
                    res.send(returnResult);
                }else{
                    returnResult.rc = 500;
                    returnResult.rcmsg = "user update error";
                    res.send(returnResult);
                }
                if(err){
                    returnResult.rc = 600;
                    returnResult.rcmsg = err.message;
                    res.send(returnResult);
                }
            })
        }
    } catch (error) {
        returnResult.rc = 500;
        returnResult.rcmsg = error.message;
        res.send(returnResult);
    }
}

/**
 * @swagger
 * /user/sign-out:
 *   get:
 *     summary: 사용자 로그아웃
 *     tags: [User]
 *     parameters:
 *       - in: header
 *         name: userId
 *         type: string
 *         required: true
 *         description: 유저 SessionKey
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *         schema:
 *          type: object
 *          properties:
 *              rc:
 *                  type: number
 *                  example: 200
 *              rcmsg:
 *                  type: string
 *                  example: logout success
 *    
 *       400:
 *         description: Bad Request(parameter error)
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 400
 *                 rcmsg:
 *                     type: string
 *                     example: no header key
 *       401:
 *         description: Bad Request(session key error)
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 401
 *                 rcmsg:
 *                     type: string
 *                     example: no header key
 *       500:
 *         description: server error
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 500
 *                 rcmsg:
 *                     type: string
 *                     example: server error
 */

UserInterface.prototype.signOut = async function(req, res) {
    let returnResult = { rc: 200, rcmsg: "success sign out" };
    if(!req.session){
        returnResult.rc = 401;
        returnResult.rcmsg = "no header key"
        return;
    }
    req.session.destroy(function(err) {
        if(err) {
            returnResult.rc = 500;
            returnResult.rcmsg = "server err"
            res.send(returnResult);
        }else {
            res.send(returnResult);
        }
    })
}

/**
 * @swagger
 * /user:
 *   delete:
 *     summary: 회원탈퇴
 *     tags: [User]
 *     parameters:
 *       - in: header
 *         name: userId
 *         type: string
 *         required: true
 *         description: 유저 SessionKey
 *     responses:
 *       200:
 *         description: 회원탈퇴 성공
 *         schema:
 *          type: object
 *          properties:
 *              rc:
 *                  type: number
 *                  example: 200
 *              rcmsg:
 *                  type: string
 *                  example: success withdrawal
 *    
 *       400:
 *         description: Bad Request(parameter error)
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 400
 *                 rcmsg:
 *                     type: string
 *                     example: no header key
 *       401:
 *         description: Bad Request(session key error)
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 401
 *                 rcmsg:
 *                     type: string
 *                     example: no header key
 *       500:
 *         description: server error
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 500
 *                 rcmsg:
 *                     type: string
 *                     example: server error
 */

UserInterface.prototype.withdrawal = async function(req, res) {
    let returnResult = { rc: 200, rcmsg: "success withdrawal" };
    const userId = req.session.userId;
    if(!req.session){
        returnResult.rc = 401;
        returnResult.rcmsg = "no header key"
        return;
    }
    const deleteUserQuery = `DELETE FROM ${USER_TABLE} WHERE user_id = ?`;
    const deleteUserValues = [userId];
    const mongoConnection = this.MongoPool.db('plogging');
    this.pool.getConnection(function(err, conn){
        conn.beginTransaction();
        conn.execute(deleteUserQuery, deleteUserValues, function(err, result) {
            if(result.affectedRows){
                // 탈퇴 유저의 이력 전체 삭제
                mongoConnection.collection('record')
                    .deleteMany({"meta.user_id": userId}, function(err, result) {
                        if(err){
                            returnResult.rc = 500;
                            returnResult.rcmsg = 'delete user error';
                            res.send(returnResult);
                            conn.rollback();
                        }else{
                            try {
                                // 탈퇴 유저의 산책이력 이미지 전체 삭제
                                if(fs.existsSync(`${filePath}${userId}`)){
                                    fs.rmdirSync(`${filePath}${userId}`, { recursive: true });
                                }
                                // 해당 산책의 점수 랭킹점수 삭제
                                //await this.redisAsyncZrem(queryKey, userId);
                                returnResult.rc = 200;
                                returnResult.rcmsg = 'success withdrawal';
                                res.send(returnResult);
                                req.session.destroy();
                                conn.commit();
                            } catch (error) {
                                returnResult.rc = 510;
                                returnResult.rcmsg = error.message;
                                res.send(returnResult);
                                conn.rollback();
                            }
                        }
                });
                
            }else{
                returnResult.rc = 500;
                returnResult.rcmsg = 'delete user error';
                res.send(returnResult);
            };
            if(err){
                returnResult.rc = 600;
                returnResult.rcmsg = err.message;
                res.send(returnResult);
            };
            
        });
        if(err){
            returnResult.rc = 500;
            returnResult.rcmsg = err.message;
            res.send(returnResult);
        };
        conn.release();
    });
}

module.exports = UserInterface;
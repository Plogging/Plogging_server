const express = require('express');
const cors=require('cors');
const util = require('../util/common.js');
const USER_TABLE = 'user';
const fs = require('fs');
const { uptime } = require('process');
//const filePath = process.env.IMG_FILE_PATH + "/profile/";
const filePath = "/mnt/Plogging_server/images/profile/";

const UserInterface = function(config) {
    const router = express.Router();
    
    router.all('*'  ,cors());
    this.router = router;
    this.mysqlPool = config.mysqlPool;
    this.pool = config.mysqlPool2;
    this.redisClient = config.redisClient;
    this.fileInterface = config.fileInterface;

    const upload = this.fileInterface({
        storage: this.fileInterface.diskStorage({
            destination: function (req, file, cb) {
            const userId = req.userId; // 세션체크 완료하면 값 받아옴
	    const dir = `${filePath}${userId}`;
    
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
    router.post('', (req, res) => this.signIn(req, res));
    router.get('/sign-out', (req, res) => this.signOut(req, res));
    router.put('', upload.single('profile_img'), (req, res) => this.update(req, res));
    return this.router;
};

UserInterface.prototype.signIn = async function(req, res) {

    let returnResult = { rc: 500, rcmsg: "server error" };
    const user = req.body;

    // case no parameter
    if(!user.type || !user.email) {
        returnResult.rc = 400;
        returnResult.rcmsg = "no parameter";
        res.status(400).send(returnResult);
        return;
    }
    // search userId in DB
    const userId = user.email + ':' + user.type
    const findUserQuery = `SELECT * FROM ${USER_TABLE} WHERE user_id = ?`;
    const findUserValues = [userId];

    this.pool.getConnection(function(err, conn){
        conn.beginTransaction();
        conn.execute(findUserQuery, findUserValues, function(err, result) {
            
            if (result.length === 0) {
                // set nickname
                let nickName = user.displayName;
                if(!user.displayName) nickName = "쓰담이";
                
                // set userImg
                let userImg = "https://i.pinimg.com/564x/d0/be/47/d0be4741e1679a119cb5f92e2bcdc27d.jpg";
                const createDateline = util.getCurrentDateTime();
                const createUserQuery = `INSERT INTO ${USER_TABLE}(user_id, display_name, profile_img, type, email, update_datetime, create_datetime) VALUES(?, ?, ?, ?, ?, ?, ?)`;
                const createUserValues = [userId, nickName, userImg, user.type, user.email, createDateline, createDateline];
                conn.execute(createUserQuery, createUserValues, function(err, result){
                    req.session.userId = userId
                    returnResult.rc = 200;
                    returnResult.rcmsg = "Success creating user";
                    returnResult.session = req.session.id;
                    returnResult.userImg = userImg;
                    returnResult.userName = nickName;
                    res.send(returnResult);
                    conn.commit()
                });
                if(err) {
                    returnResult.rc = 600;
                    returnResult.rcmsg = err.message;
                    res.send(returnResult);
                    conn.rollback()
                }
            }else{
                req.session.userId = userId
                returnResult.rc = 200;
                returnResult.rcmsg = "Success getting user";
                returnResult.session = req.session.id;
                returnResult.userImg = result[0].profile_img;
                returnResult.userName = result[0].display_name;
                res.send(returnResult);
                conn.commit()
            };
        });
        if(err){
            returnResult.rc = 600;
            returnResult.rcmsg = err.message;
            res.send(returnResult);
            conn.rollback()
        }
        conn.release()
    });
}

UserInterface.prototype.update = async function(req, res) {
    
    const pool = this.pool;
    let returnResult = { rc: 200, rcmsg: "success" };
    const user = req.body;
    const userId = req.userId;
    const currentTime = util.getCurrentDateTime();
    
    try {
        if(!user.display_name || !req.file) {
            returnResult.rc = 400;
            returnResult.rcmsg = "no parameter";
            res.status(400).send(returnResult);
            return;
        }else{
            const profileImg = process.env.SERVER_REQ_INFO + '/' + req.file.path.split("/mnt/Plogging_server/images/")[1];
	    //const profileImg = `${process.env.SERVER_REQ_INFO}/profile/${userId}/profileImg.PNG`;
	    //const profileImg = req.file.path;
            let updateUserQuery = `UPDATE ${USER_TABLE} SET display_name = ?, profile_img = ?, update_datetime = ? WHERE user_id = ?`
            let updateUserValues = [user.display_name, profileImg, currentTime, userId];
            
            pool.execute(updateUserQuery, updateUserValues, function(err, result) {
                console.log(result)
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
        console.log(error);
        res.send(returnResult);
    }
}

UserInterface.prototype.signOut = async function(req, res) {
    let returnResult = { rc: 200, rcmsg: "success sign out" };
    if(!req.session){
        returnResult.rc = 400;
        returnResult.rcmsg = "no header key"
        return;
    }
    req.session.destroy(function(err) {
        if(err) {
            returnResult.rc = 500;
            returnResult.rcmsg = "server err"
            res.send(returnResult);
            console.log(err);
        }
        else {
            console.log("logout success");  // session delete in redis
            res.send(returnResult);
        }
    })
}

module.exports = UserInterface;

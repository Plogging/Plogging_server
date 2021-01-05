const express = require('express');
const cors=require('cors');

const UserInferface = function(config) {
    const router = express.Router();
    
    router.all('*',cors());

    this.router = router;
    this.mysqlPool = config.mysqlPool;
    this.mysqlPool2 = config.mysqlPool2;
    this.redisClient = config.redisClient;

    // 유저 관련 api 구현
    router.get("/login", (req, res) => this.login(req, res));
    router.get('/logout', (req, res) => this.logout(req, res));

    return this.router;
};

UserInferface.prototype.login = async function(req, res) {
    console.log(req.session);
    
    // session insert in redis
    req.session.userId = "xowns9418"; 
    res.send("user login api !");
}

UserInferface.prototype.logout = async function(req, res) {
    
    req.session.destroy(function(err) {
        if(err) console.log(err);
        else {
            console.log("logout success !");  // session delete in redis
            res.send("user logout api !");
        }
    })
}

module.exports = UserInferface;
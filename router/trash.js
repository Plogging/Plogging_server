const express = require('express');
const cors=require('cors');

const TrashInferface = function(config) {
    const router = express.Router();
    router.all('*',cors());

    this.router = router;
   this.mysqlPool = config.mysqlPool;
   this.mysqlPool2 = config.mysqlPool2;
    this.redisClient = config.redisClient;

    // 쓰레기 관련 api 구현
    router.get("/", (req, res) => this.testTrash(req, res));

    return this.router;

};

TrashInferface.prototype.testTrash = async function(req, res) {
    res.send("trash get api !");
}

module.exports = TrashInferface;
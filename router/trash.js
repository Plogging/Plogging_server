const express = require('express');
const cors=require('cors');
const fs = require('fs');
const util = require('../util/common.js');
const { ObjectId } = require('mongodb');

const TrashInferface = function(config) {
    const router = express.Router();
    router.all('*',cors());

    this.router = router;
    this.mysqlPool = config.mysqlPool;
    this.mysqlPool2 = config.mysqlPool2;
    this.redisClient = config.redisClient;
    this.MongoPool = config.MongoPool;
    this.fileInterface = config.fileInterface;

    const upload = this.fileInterface({
        storage: this.fileInterface.diskStorage({
          destination: function (req, file, cb) {
            const userId = req.body.userId; // 세션체크 완료하면 값 받아옴
            const dir = `E:/file_test/trash/${userId}`;

            if (!fs.existsSync(dir)){
                console.log(dir);
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

    // 쓰레기 관련 api 구현
    router.get("/", (req, res) => this.readTrash(req, res));// read
    router.post("/", upload.single('trashImg'), (req, res) => this.writeTrash(req, res)); // create
    router.delete("/", (req, res) => this.deleteTrash(req,res)); // delete
    return this.router;
};

/**
 * 산책 이력조회 
 *  case 1. 유저 id 기준으로 최신순 조회
 *  case 2. 유저 id 기준으로 이동거리 많은순 조회
 *  case 3. 유저 id 기준으로 쓰레기 많이 주운순 조회
 *  case 4. 유저 id 기준으로 칼로리 소모 많은순 조회
 */
TrashInferface.prototype.readTrash = async function(req, res) {
    console.log("trash read api !");

    let userId = req.get("userId"); // header에 있는 값 받아옴
    let query = {"meta.user_id": userId};
    let options = {sort: {"meta.created_time": -1}}; // 최신순
    let mongoConnection = null;
    let returnResult = { rc: 200, rcmsg: "success" };

    try {
        mongoConnection = this.MongoPool.db('test');
        let trash = await mongoConnection.collection('trash').find(query, options).toArray();
       
        returnResult.flogging_list = trash;
        res.status(200).send(returnResult);
    } catch(e) {
        console.log(e);
        returnResult.rc = 500;
        returnResult = e.message;
        res.status(500).send(returnResult);
    } finally {
        mongoConnection=null;
    }
}

/**
 * 산책 이력 등록
 *  
 */
TrashInferface.prototype.writeTrash = async function(req, res) {
    console.log("trash write api !");

    let userId = req.get("userId"); // header에 있는 값 받아옴
    let trashObj = req.body.floggingObj;
    trashObj = JSON.parse(trashObj);

    trashObj.meta.user_id = userId;
    trashObj.meta.create_time = util.getCurrentDateTime();
    trashObj.meta.trash_img = `http://localhost:20000/trash/${userId}/flogging_${trashObj.meta.create_time}.PNG`; // file server 찔러서 이미지 가져옴

    let returnResult = { rc: 200, rcmsg: "success" };
    let mongoConnection = null;
    try {
        mongoConnection = this.MongoPool.db('test');
        await mongoConnection.collection('trash').insertOne(trashObj);
        res.status(200).send(returnResult);
    } catch(e) {
        console.log(e);
        returnResult.rc = 500;
        returnResult.rcmsg = e.message;
        res.status(500).send(returnResult);
    } finally {
        mongoConnection=null;
    }
}

/*
 * 산책 이력삭제
 *   case 1. 유저가 특정 산책 이력을 삭제하거나(1개 삭제) - 산책이력의 objectId값을 파라미터로 전달
 *   case 2. 회원 탈퇴했을때(해당 회원 산책이력 모두 삭제) - 산책이력의 objectId값을 파라미터로 전달하지 않음
 */
TrashInferface.prototype.deleteTrash = async function(req, res) {
    console.log("trash delete api !");

    let userId = req.get("userId"); // header에 있는 값 받아옴
    let mongoObjectId = req.body.objectId;
    let query = null;

    let returnResult = { rc: 200, rcmsg: "success" };
    let mongoConnection = null;
    try {
        mongoConnection = this.MongoPool.db('test');

        if(mongoObjectId) { // 해당 이력만 삭제
            query = {"_id": ObjectId(mongoObjectId)};
            await mongoConnection.collection('trash').deleteOne(query);
        }
        else { // 전체이력 삭제
            query = {"meta.user_id": userId};
            await mongoConnection.collection('trash').deleteMany(query);
        }

        res.status(200).send(returnResult);
    } catch(e) {
        console.log(e);
        returnResult.rc = 500;
        returnResult.rcmsg = e.message;
        res.status(500).send(returnResult);
    } finally {
        mongoConnection=null;
    }
}

module.exports = TrashInferface;
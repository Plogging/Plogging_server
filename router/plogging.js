const express = require('express');
const cors=require('cors');
const fs = require('fs');
const util = require('../util/common.js');
const { ObjectId } = require('mongodb');

const PloggingInferface = function(config) {
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
            const dir = `/mnt/Nexters_Flogging/images/plogging/${userId}`;
    
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

    // 플로깅 관련 api 구현
    router.get("/", (req, res) => this.readPlogging(req, res));// read
    router.post("/", upload.single('ploggingImg'), (req, res) => this.writePlogging(req, res)); // create
    router.delete("/", (req, res) => this.deletePlogging(req,res)); // delete
    return this.router;
};

/**
 * 산책 이력조회  (페이징 처리 필요)
 *  case 1. 유저 id 기준으로 최신순 조회
 *  case 2. 유저 id 기준으로 이동거리 많은순 조회
 *  case 3. 유저 id 기준으로 쓰레기 많이 주운순 조회
 *  case 4. 유저 id 기준으로 칼로리 소모 많은순 조회
 */
PloggingInferface.prototype.readPlogging = async function(req, res) {
    console.log("plogging read api !");

    let userId = req.get("userId"); // header에 있는 값 받아옴
    let query = {"meta.user_id": userId};
    let options = {sort: {"meta.created_time": -1}}; // 최신순
    let mongoConnection = null;
    let returnResult = { rc: 200, rcmsg: "success" };

    try {
        mongoConnection = this.MongoPool.db('test');
        let PloggingList = await mongoConnection.collection('plogging').find(query, options).toArray();
       
        returnResult.plogging_list = PloggingList;
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
 * - img는 optional. 만약, 입력안하면 baseImg로 세팅
 */
PloggingInferface.prototype.writePlogging = async function(req, res) {
    console.log("plogging write api !");

    let returnResult = { rc: 200, rcmsg: "success" };

    let userId = req.get("userId"); // header에 있는 값 받아옴
    let ploggingObj = req.body.ploggingObj;
    
    if(ploggingObj === undefined) {
        returnResult.rc = 400;
        returnResult.rcmsg = "요청 파라미터를 확인해주세요.";
        res.status(400).send(returnResult);
        return;
    }

    ploggingObj = JSON.parse(ploggingObj);

    ploggingObj.meta.user_id = userId;
    ploggingObj.meta.create_time = util.getCurrentDateTime();

    //이미지가 없을때는 baseImg insert
    if(req.file===undefined) ploggingObj.meta.plogging_img = `http://localhost:20000/baseImg.PNG`;
    else ploggingObj.meta.plogging_img = `http://localhost:20000/plogging/${userId}/flogging_${ploggingObj.meta.create_time}.PNG`;

    let mongoConnection = null;
    try {
        mongoConnection = this.MongoPool.db('test');
        await mongoConnection.collection('plogging').insertOne(ploggingObj);
        
        // 해당 산책의 plogging 점수
        let ploggingScore = calcPloggingScore(ploggingObj);
        //let queryKey = "Plogging";
        //await this.redisClient.zadd(queryKey, ploggingScore, userId); // 랭킹서버에 insert
 
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
PloggingInferface.prototype.deletePlogging = async function(req, res) {
    console.log("plogging delete api !");

    let userId = req.get("userId"); // header에 있는 값 받아옴
    let mongoObjectId = req.body.objectId;
    let query = null;

    let returnResult = { rc: 200, rcmsg: "success" };
    let mongoConnection = null;
    try {
        mongoConnection = this.MongoPool.db('test');

        if(mongoObjectId) { // 해당 이력만 삭제
            query = {"_id": ObjectId(mongoObjectId)};
            await mongoConnection.collection('plogging').deleteOne(query);
            // 산책 이력 이미지 삭제
        } else { // 전체이력 삭제
            query = {"meta.user_id": userId};
            await mongoConnection.collection('plogging').deleteMany(query);
            // 산책 이력 이미지 삭제
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

// 산책 점수 계산
function calcPloggingScore(ploggingObj) {
    let score = 0;
    const trash_score_list = [1, 2, 3, 4, 5];

    const distance = ploggingObj.meta.distance;
    const calorie = ploggingObj.meta.calorie;
    const flogging_time = ploggingObj.meta.flogging_time;
    const pick_list = ploggingObj.pick_list; // array

    for(let i=0; i<pick_list.length; i++) {
        const trash_type = pick_list[i].trash_type;
        const pick_count = pick_list[i].pick_count;

        if(trash_type === 0) score += pick_count * trash_score_list[0];
        else if(trash_type === 1) score += (pick_count * trash_score_list[1]);
        else if(trash_type === 2) score += (pick_count * trash_score_list[2]);
        else if(trash_type === 3) score += (pick_count * trash_score_list[3]);
    }

    return score;
};

module.exports = PloggingInferface;
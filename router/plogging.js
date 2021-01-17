const express = require('express');
const cors=require('cors');
const fs = require('fs');
const { promisify } = require('util');
const util = require('../util/common.js');
const { ObjectId } = require('mongodb');
const swaggerValidation = require('../util/validator')
//const filePath = process.env.IMG_FILE_PATH + "/plogging/";
const filePath = "/mnt/Plogging_server/images/plogging/";

const PloggingInferface = function(config) {
    const router = express.Router();
    router.all('*',cors());

    this.router = router;
    this.mysqlPool = config.mysqlPool;
    this.mysqlPool2 = config.mysqlPool2;
    this.redisClient = config.redisClient;
    this.MongoPool = config.MongoPool;
    this.fileInterface = config.fileInterface;
    this.lock = promisify(require('redis-lock')(this.redisClient));

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
            cb(null, `plogging_${util.getCurrentDateTime()}.PNG`);
          }
        }),
        limits: {fileSize: 1*1000*5000}, // file upload 5MB 제한
      })

    // 플로깅 관련 api 구현
    router.get("/", swaggerValidation.validate, (req, res) => this.readPlogging(req, res));// read
    router.post("/", upload.single('ploggingImg'), swaggerValidation.validate, (req, res) => this.writePlogging(req, res)); // create
    router.delete("/", swaggerValidation.validate, (req, res) => this.deletePlogging(req,res)); // delete

   this.redisAsyncZrem = promisify(this.redisClient.zrem).bind(this.redisClient);

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

    let userId = req.userId; // api를 call한 userId
    let targetUserId = req.query.targetUserId; // 산책이력을 조회를 할 userId

    /**
     * 1. 내 산책이력 조회 ( tartgetUserId 없으면 내 산책이력 조회 )
     * 2. 상대방 산책이력 조회 ( targetUserId가 있으면 해당 유저의 산책이력 조회)
     */

    if(targetUserId) userId = targetUserId;

    let searchType = Number(req.query.searchType); // 최신순(0), 점수순(1), 거리순(2)
    let query = {"meta.user_id": userId};
    let options = [{sort: {"meta.created_time": -1}},
                   {sort: {"meta.plogging_total_score": -1}},
                   {sort: {"meta.distance": -1}}];  // 최신순(0), 점수순(1),  거리순(2)
    let mongoConnection = null;
    let returnResult = { rc: 200, rcmsg: "success" };

    try {
        mongoConnection = this.MongoPool.db('plogging');
        let PloggingList = await mongoConnection.collection('record').find(query, options[searchType]).toArray();
       
        returnResult.plogging_list = PloggingList;
        res.status(200).send(returnResult);
    } catch(e) {
        console.log(e);
        mongoConnection=null;
        returnResult.rc = 500;
        returnResult = e.message;
        res.status(500).send(returnResult);
    }
}

/**
 * 산책 이력 등록
 * - img는 optional. 만약, 입력안하면 baseImg로 세팅
 */
PloggingInferface.prototype.writePlogging = async function(req, res) {
    console.log("plogging write api !");

    let returnResult = { rc: 200, rcmsg: "success" };

    let userId = req.userId;
    let ploggingObj = req.body.ploggingData;
    
    ploggingObj = JSON.parse(ploggingObj);

    ploggingObj.meta.user_id = userId;
    ploggingObj.meta.create_time = util.getCurrentDateTime();

    //이미지가 없을때는 baseImg insert
    if(req.file===undefined) ploggingObj.meta.plogging_img = `${process.env.SERVER_REQ_INFO}/plogging/baseImg.PNG`;
    else ploggingObj.meta.plogging_img = process.env.SERVER_REQ_INFO + '/' + req.file.path.split("/mnt/Plogging_server/images/")[1];
    //else ploggingObj.meta.plogging_img = req.file.path;

    let mongoConnection = null;
    try {
        // 해당 산책의 plogging 점수
        const ploggingScoreArr = calcPloggingScore(ploggingObj);
        const ploggingTotalScore = Number(ploggingScoreArr[0] + ploggingScoreArr[1]);
        const ploggingActivityScore =  Number(ploggingScoreArr[0]);
        const ploggingEnvironmentScore = Number(ploggingScoreArr[1]);

        ploggingObj.meta.plogging_total_score = ploggingTotalScore;
        ploggingObj.meta.plogging_activity_score = ploggingActivityScore;
        ploggingObj.meta.plogging_environment_score =  ploggingEnvironmentScore;
      
        mongoConnection = this.MongoPool.db('plogging');
        await mongoConnection.collection('record').insertOne(ploggingObj);

        // 누적합 방식이라 조회후 기존점수에 현재 플로깅점수 더해서 다시저장
        const weeklyRankingKey = "weekly"
        const monthlyRankingKey = "monthly"
        const unlock = await this.lock("plogging-lock"); // redis lock

        // 주간 합계
        let originWeekScore = await this.redisClient.zscore(weeklyRankingKey, userId);
       
        if(!originWeekScore) originWeekScore = Number(0);
        const resultWeekScore = Number(originWeekScore)+Number(ploggingTotalScore);
        await this.redisClient.zadd(weeklyRankingKey, resultWeekScore, userId); // 랭킹서버에 insert

        // 월간 합계
        let originMonthScore = await this.redisClient.zscore(monthlyRankingKey, userId);
       
        if(!originMonthScore) originMonthScore = Number(0);
        const resultMonthScore = Number(originMonthScore)+Number(ploggingTotalScore);
        await this.redisClient.zadd(monthlyRankingKey, resultMonthScore, userId); // 랭킹서버에 insert

        unlock();
 
        returnResult.score = { };
        returnResult.score.totalScore = ploggingTotalScore;
        returnResult.score.activityScore = ploggingActivityScore;
        returnResult.score.environmentScore = ploggingEnvironmentScore;

        res.status(200).send(returnResult);
    } catch(e) {
        console.log(e);
        unlock(); // lock을 걸고 오류가 날수도 있으므로 catch문에는 반드시 unlock을 걸어줘야함.
        mongoConnection=null;
        returnResult.rc = 500;
        returnResult.rcmsg = e.message;
        res.status(500).send(returnResult);
    }
}

/*
 * 산책 이력삭제
 *   case 1. 유저가 특정 산책 이력을 삭제하거나(1개 삭제) - 산책이력의 objectId값을 파라미터로 전달
 *   case 2. 회원 탈퇴했을때(해당 회원 산책이력 모두 삭제) - 산책이력의 objectId값을 파라미터로 전달하지 않음
 */
PloggingInferface.prototype.deletePlogging = async function(req, res) {
    console.log("plogging delete api !");

    let userId = req.userId;
    let mongoObjectId = req.query.objectId;
    let ploggingImgName = req.query.ploggingImgName; // plogging_20210106132743.PNG
    let ploggingImgPath = `${filePath}${userId}/${ploggingImgName}`; 

    let query = null;

    let returnResult = { rc: 200, rcmsg: "success" };
    let mongoConnection = null;
    try {
        mongoConnection = this.MongoPool.db('plogging');

        if(mongoObjectId) { // 해당 이력만 삭제
            query = {"_id": ObjectId(mongoObjectId)};

            // 산책이력 삭제
            await mongoConnection.collection('record').deleteOne(query);
         
            // 산책이력 이미지 삭제
            if(ploggingImgPath) fs.unlinkSync(ploggingImgPath);

            // 해당 산책의 점수 랭킹점수 삭제
            //let queryKey = "Plogging";

            //await this.redisAsyncZrem(queryKey, userId);
        } else { // 전체이력 삭제 -> 회원탈퇴
            query = {"meta.user_id": userId};

            // 탈퇴 유저의 이력 전체 삭제
            await mongoConnection.collection('record').deleteMany(query);

            // 탈퇴 유저의 산책이력 이미지 전체 삭제
            fs.rmdirSync(`${filePath}${userId}`, { recursive: true });

             // 해당 산책의 점수 랭킹점수 삭제
            //await this.redisAsyncZrem(queryKey, userId);
        }
        res.status(200).send(returnResult);
    } catch(e) {
        console.log(e);
        mongoConnection=null;
        returnResult.rc = 500;
        returnResult.rcmsg = e.message;
        res.status(500).send(returnResult);
    }
}

// 산책 점수 계산 ( 운동점수, 환경점수 )
function calcPloggingScore(ploggingObj) {
    let score = [ ]; // score[0]: 운동점수, score[1]: 환경점수
    const pivotDistance = 300; // 300m
    const movePerScore = 1; // 10m 이동시 1점 증가
    const maxCountDistance = 10000; // 10km
    const pickPerScore = 10; // 쓰레기 1개 주울때마다 10점 증가
    
    const distance = ploggingObj.meta.distance; // 플로깅 거리
    const pick_list = ploggingObj.pick_list; // 주운 쓰레기 리스트
    
    if(distance < pivotDistance) score[0] = 0; //300m 이하는 거리점수 없음
    else {
        if(maxCountDistance < distance) distance = maxCountDistance; // 10km 넘어가면 그 이상 거리점수 없음
        score[0] = ((Math.floor(distance/10))*movePerScore) + addExtraScorePerKm(distance);
    }

    let pickCount=0;
    for(let i=0; i<pick_list.length; i++) pickCount += pick_list[i].pick_count;
    score[1]= pickCount*pickPerScore;

    return score;
};

// 1km 마다 기본점수 폭 늘려준다. 해당 거리의 경우 추가되는 총 점수
function addExtraScorePerKm(distance) {
    const hopCnt = Math.floor(distance/1000);
    let extraScore=0;
    for(let i=1; i<=hopCnt; i++) extraScore += (i*10);
    return extraScore;
}

module.exports = PloggingInferface;

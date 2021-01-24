const express = require('express');
const cors=require('cors');
const fs = require('fs');
const { promisify } = require('util');
const util = require('../util/common.js');
const USER_TABLE = 'user';
const { ObjectId } = require('mongodb');
const swaggerValidation = require('../util/validator')
const ploggingFilePath = process.env.IMG_FILE_PATH + "/plogging/";
const logger = require("../util/logger.js")("plogging.js");

const PloggingInterface = function(config) {
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
                const dir = `${ploggingFilePath}${userId}`;
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
    router.get("/:targetUserId", swaggerValidation.validate, (req, res) => this.readPlogging(req, res));// read
    router.post("/", upload.single('ploggingImg'), swaggerValidation.validate, (req, res) => this.writePlogging(req, res)); // create
    router.delete("/", swaggerValidation.validate, (req, res) => this.deletePlogging(req,res)); // delete

    return this.router;
};

/**
 * 산책 이력조회  (페이징 처리 필요)
 *  case 1. 최신순
 *  case 2 .플로깅 점수순
 *  case 2. 플로깅 거리순
 */
/**
 * @swagger
 */
PloggingInterface.prototype.readPlogging = async function(req, res) {
    logger.info("plogging read api !");

    let userId = req.userId; // api를 call한 userId
    let targetUserId = req.params.targetUserId; // 산책이력을 조회를 할 userId
    let ploggingCntPerPage = req.query.ploggingCntPerPage; // 한 페이지에 보여줄 산책이력 수
    let pageNumber = req.query.pageNumber; // 조회할 페이지 Number

    // default -> 각 페이지에 4개씩, 1번 페이지 조회
    if(!ploggingCntPerPage) ploggingCntPerPage = 4;
    if(!pageNumber) pageNumber = 1;

    /**
     * 1. 내 산책이력 조회 ( tartgetUserId 없으면 내 산책이력 조회 )
     * 2. 상대방 산책이력 조회 ( targetUserId가 있으면 해당 유저의 산책이력 조회)
     */

    if(targetUserId) userId = targetUserId;

    let searchType = Number(req.query.searchType); // 최신순(0), 점수순(1), 거리순(2)
    let query = {"meta.user_id": userId};
    let sort_option = [{"meta.created_time": -1},
                       {"meta.plogging_total_score": -1},
                       {"meta.distance": -1}];  
    let options = {
        sort: sort_option[searchType],
        skip: (pageNumber-1)*ploggingCntPerPage,
        limit: ploggingCntPerPage
    }

    let mongoConnection = null;
    let returnResult = { rc: 200, rcmsg: "success" };

    try {
        mongoConnection = this.MongoPool.db('plogging');
        let PloggingList = await mongoConnection.collection('record').find(query,options).toArray();
        returnResult.plogging_list = PloggingList;
        res.status(200).send(returnResult);
    } catch(e) {
        logger.error(e.message);
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
PloggingInterface.prototype.writePlogging = async function(req, res) {
    logger.info("plogging write api !");

    let returnResult = { rc: 200, rcmsg: "success" };

    const userId = req.userId;
    let ploggingObj = req.body.ploggingData;
    
    ploggingObj = JSON.parse(ploggingObj);

    ploggingObj.meta.user_id = userId;
    ploggingObj.meta.create_time = util.getCurrentDateTime();    

    //이미지가 없을때는 baseImg insert
    if(req.file===undefined) ploggingObj.meta.plogging_img = `${process.env.SERVER_REQ_INFO}/plogging/baseImg.PNG`;
    else ploggingObj.meta.plogging_img = process.env.SERVER_REQ_INFO + '/' + req.file.path.split(`${process.env.IMG_FILE_PATH}/`)[1];

    let mongoConnection = null;
    let mariadbConnection = null;
    let redisUnLock = null;
    try {
        // 해당 산책의 plogging 점수
        const ploggingScoreArr = calcPloggingScore(ploggingObj);
        const ploggingTotalScore = Number(ploggingScoreArr[0] + ploggingScoreArr[1]);
        const ploggingActivityScore =  Number(ploggingScoreArr[0]);
        const ploggingEnvironmentScore = Number(ploggingScoreArr[1]);
        const ploggingDistance = ploggingObj.meta.distance;
        const pickList = ploggingObj.pick_list;
        const pickCount = calPickCount(pickList);

        ploggingObj.meta.plogging_total_score = ploggingTotalScore;
        ploggingObj.meta.plogging_activity_score = ploggingActivityScore;
        ploggingObj.meta.plogging_environment_score = ploggingEnvironmentScore;

        // rdb update ( 점수, 거리, 쓰레기 주운갯수)
        mariadbConnection = await this.mysqlPool2.promise().getConnection();
        const selectSql = `SELECT score, distance, trash from ${USER_TABLE} WHERE user_id=?`;
        
        await mariadbConnection.beginTransaction();
        const  [userData, _] = await mariadbConnection.query(selectSql, [userId]);
        // 기존 점수 조회
        const updateScore = userData[0].score + ploggingTotalScore;
        const updateDistance = userData[0].distance + ploggingDistance;
        const updateTrash = userData[0].trash + pickCount;
        const currentTime = util.getCurrentDateTime();
        const updateSql = `UPDATE ${USER_TABLE} SET score = ?, distance = ?, trash = ?, update_datetime = ? WHERE user_id = ?`;

        await mariadbConnection.query(updateSql, [updateScore, updateDistance, updateTrash, currentTime, userId]);
        await mariadbConnection.commit();

        // mongodb update
        mongoConnection = this.MongoPool.db('plogging');
        await mongoConnection.collection('record').insertOne(ploggingObj);

        // 누적합 방식이라 조회후 기존점수에 현재 플로깅점수 더해서 다시저장
        // redis update
        const weeklyRankingKey = "weekly"
        const monthlyRankingKey = "monthly"
        redisUnLock = await this.lock("plogging-lock"); // redis lock

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

        returnResult.score = { };
        returnResult.score.totalScore = ploggingTotalScore;
        returnResult.score.activityScore = ploggingActivityScore;
        returnResult.score.environmentScore = ploggingEnvironmentScore;

        res.status(200).send(returnResult);
    } catch(e) {
        logger.error(e.message);
        await mariadbConnection.rollback();
        returnResult.rc = 500;
        returnResult.rcmsg = e.message;
        res.status(500).send(returnResult);
    } finally {
        await mariadbConnection.release();
        mongoConnection=null;
        if(redisUnLock) redisUnLock();
    }
}

/*
 * 산책 이력삭제
 *  ->산책이력의 objectId값을 파라미터로 전달
 *   
 */
PloggingInterface.prototype.deletePlogging = async function(req, res) {
    logger.info("plogging delete api !");

    let userId = req.userId;
    let mongoObjectId = req.query.objectId;
    let ploggingImgName = req.query.ploggingImgName; // plogging_20210106132743.PNG
    let ploggingImgPath = `${ploggingFilePath}${userId}/${ploggingImgName}`; 
    let query = null;

    let returnResult = { rc: 200, rcmsg: "success" };
    let mongoConnection = null;
    try {
        mongoConnection = this.MongoPool.db('plogging');
        query = {"_id": ObjectId(mongoObjectId)};
            
        // 산책이력 삭제
        await mongoConnection.collection('record').deleteOne(query);
            
        // 산책이력 이미지 삭제
        fs.unlinkSync(ploggingImgPath);

        // 해당 산책의 점수 랭킹점수 삭제
        await this.redisClient.zrem("weekly", userId);
        await this.redisClient.zrem("monthly", userId);

        res.status(200).send(returnResult);
    } catch(e) {
        logger.error(e.message);
        returnResult.rc = 500;
        returnResult.rcmsg = e.message;
        res.status(500).send(returnResult);
    } finally {
        mongoConnection=null;
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
    const pickList = ploggingObj.pick_list; // 주운 쓰레기 리스트
    
    if(distance < pivotDistance) score[0] = 0; //300m 이하는 거리점수 없음
    else {
        if(maxCountDistance < distance) distance = maxCountDistance; // 10km 넘어가면 그 이상 거리점수 없음
        score[0] = ((Math.floor(distance/10))*movePerScore) + addExtraScorePerKm(distance);
    }

    let pickCount=0;
    for(let i=0; i<pickList.length; i++) pickCount += pickList[i].pick_count;
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

// 쓰레기 주운갯수 계산
function calPickCount(pickList) {
    let pickCount=0;
    for(let i=0; i<pickList.length; i++) pickCount += pickList[i].pick_count;
    return pickCount;
}


module.exports = PloggingInterface;

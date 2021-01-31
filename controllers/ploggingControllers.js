const fs = require('fs');
const util = require('../util/common.js');
const { promisify } = require('util');
const ploggingFilePath = process.env.IMG_FILE_PATH + "/plogging/";
const PloggingSchema = require('../models/plogging');
const RankSchema = require('../models/ranking');
const User = require('../models/users.js');
const {sequelize} = require('../models/index');
const logger = require("../util/logger.js")("plogging.js");
const logHelper = require("../util/logHelper.js");

/**
 * 산책 이력조회  (페이징 처리 필요)
 *  case 1. 최신순
 *  case 2 .플로깅 점수순
 *  case 2. 플로깅 거리순
 */
const readPlogging = async function(req, res) {
    logger.info("plogging read api !");
    logger.info(logHelper.reqWrapper(req, "plogging"));

    const userId = req.userId; // api를 call한 userId
    const targetUserId = req.params.targetUserId; // 산책이력을 조회를 할 userId
    let ploggingCntPerPage = req.query.ploggingCntPerPage; // 한 페이지에 보여줄 산책이력 수
    let pageNumber = req.query.pageNumber; // 조회할 페이지 Number

    // default -> 각 페이지에 4개씩, 1번 페이지 조회
    if(!ploggingCntPerPage) ploggingCntPerPage = 4;
    if(!pageNumber) pageNumber = 1;

    let searchType = Number(req.query.searchType); // 최신순(0), 점수순(1), 거리순(2)
    let query = {"meta.user_id": targetUserId};
    let sort_option = [{"meta.created_time": -1},
                       {"meta.plogging_total_score": -1},
                       {"meta.distance": -1}];  
    let options = {
        sort: sort_option[searchType],
        skip: (pageNumber-1)*ploggingCntPerPage,
        limit: ploggingCntPerPage
    }

    let returnResult = { rc: 200, rcmsg: "success" };

    try {
        returnResult.plogging_list = await PloggingSchema.readPloggingModel(query, options);
        res.status(200).json(returnResult);
    } catch(e) {
        logger.error(e.message);
        returnResult.rc = 500;
        returnResult = e.message;
        res.status(500).json(returnResult);
    }
}

/**
 * 산책 이력 등록
 * - img는 optional. 만약, 입력안하면 baseImg로 세팅
 */
const writePlogging = async function(req, res) {
    logger.info("plogging write api !");
    logger.info(logHelper.reqWrapper(req, "plogging"));

    let returnResult = { rc: 200, rcmsg: "success" };

    const userId = req.userId;
    let ploggingObj = req.body.ploggingData;
    ploggingObj = JSON.parse(ploggingObj);

    ploggingObj.meta.user_id = userId;
    ploggingObj.meta.created_time = util.getCurrentDateTime(); 

    const ploggingScoreArr = calcPloggingScore(ploggingObj);
    const ploggingTotalScore = Number(ploggingScoreArr[0] + ploggingScoreArr[1]);
    const ploggingDistance = ploggingObj.meta.distance;
    const pickList = ploggingObj.pick_list;
    const pickCount = calPickCount(pickList);
    ploggingObj.meta.plogging_total_score = ploggingTotalScore;

    //이미지가 없을때는 baseImg insert
    if(req.file===undefined) ploggingObj.meta.plogging_img = `${process.env.SERVER_REQ_INFO}/plogging/baseImg.PNG`;
    else ploggingObj.meta.plogging_img = process.env.SERVER_REQ_INFO + '/' + req.file.path.split(`${process.env.IMG_FILE_PATH}/`)[1];

    try {

        await sequelize.transaction(async (t) => {
            const userData = await User.findOneUser(userId, t);

            const updatedPloggingData = { };
            // 주간
            updatedPloggingData.scoreWeek = userData.score_week + ploggingTotalScore;
            updatedPloggingData.distanceWeek = userData.distance_week + ploggingDistance;
            updatedPloggingData.trashWeek = userData.trash_week + pickCount;
            
            // 월간
            updatedPloggingData.scoreMonth = userData.score_month + ploggingTotalScore;
            updatedPloggingData.distanceMonth = userData.distance_month + ploggingDistance;
            updatedPloggingData.trashMonth = userData.trash_month + pickCount;

            // mariadb update
            await User.updateUserPloggingData(updatedPloggingData, userId, t);

            // mongodb update
            await PloggingSchema.writePloggingModel(ploggingObj);

            // redis update
            await RankSchema.update(userId, ploggingTotalScore);

            res.status(200).json(returnResult);
        });
    } catch(e) {
        logger.error(e.message);
        returnResult.rc = 500;
        returnResult.rcmsg = e.message;
        res.status(500).json(returnResult);
    } finally {
    
    }
}

/*
 * 산책 이력삭제
 *  ->산책이력의 objectId값을 파라미터로 전달
 *   
 */
const deletePlogging = async function(req, res) {
    logger.info("plogging delete api !");
    logger.info(logHelper.reqWrapper(req, "plogging"));

    let userId = req.userId;
    let mongoObjectId = req.query.objectId;
    let ploggingImgName = req.query.ploggingImgName; // plogging_20210106132743.PNG
    let ploggingImgPath = `${ploggingFilePath}${userId}/${ploggingImgName}`; 

    let returnResult = { rc: 200, rcmsg: "success" };
    try {
        // 산책이력 삭제
        PloggingSchema.deletePlogging(mongoObjectId);
            
        // 산책이력 이미지 삭제
        if(fs.existsSync(ploggingImgPath)) fs.unlinkSync(ploggingImgPath);
        res.status(200).json(returnResult);
    } catch(e) {
        logger.error(e.message);
        returnResult.rc = 500;
        returnResult.rcmsg = e.message;
        res.status(500).json(returnResult);
    } finally {
    
    }
}
const getPloggingScore = async function(req, res) {
    let returnResult = { rc: 200, rcmsg: "success" };

    const userId = req.userId;
    let ploggingObj = req.body.ploggingData;
    ploggingObj = JSON.parse(ploggingObj);

    try {
        // 해당 산책의 plogging 점수
        const ploggingScoreArr = calcPloggingScore(ploggingObj);
        const ploggingTotalScore = Number(ploggingScoreArr[0] + ploggingScoreArr[1]);
        const ploggingActivityScore =  Number(ploggingScoreArr[0]);
        const ploggingEnvironmentScore = Number(ploggingScoreArr[1]);

        returnResult.score = { };
        returnResult.score.totalScore = ploggingTotalScore;
        returnResult.score.activityScore = ploggingActivityScore;
        returnResult.score.environmentScore = ploggingEnvironmentScore;

        res.status(200).json(returnResult);
    } catch(e) {
        logger.error(e.message);
        returnResult.rc = 500;
        returnResult.rcmsg = e.message;
        res.status(500).json(returnResult);
    }
};

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

module.exports = {
   readPlogging,
   writePlogging,
   deletePlogging,
   getPloggingScore
};

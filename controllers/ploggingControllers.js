const fs = require('fs');
const util = require('../util/common.js');
const ploggingFilePath = process.env.IMG_FILE_PATH + "/plogging/";
const PloggingSchema = require('../models/plogging');
const RankSchema = require('../models/ranking');
const User = require('../models/user.js');
const { sequelize } = require('../models/index');
const logger = require("../util/logger.js")("plogging.js");
const logHelper = require("../util/logHelper.js");
const pagingHelper = require('../util/pagingHelper');
const { BadRequest } = require('throw.js');

/**
 * 산책 이력조회  (페이징 처리 필요)
 *  case 1. 최신순
 *  case 2 .플로깅 점수순
 *  case 2. 플로깅 거리순
 */
const readPlogging = async function (req, res) {
    logger.info("plogging read api !");
    logger.info(logHelper.reqWrapper(req, "plogging"));

    let returnResult = { rc: 200, rcmsg: "success" };
    const userId = req.userId; // api를 call한 userId
    const targetUserId = req.params.targetUserId; // 산책이력을 조회를 할 userId
    let ploggingCntPerPage = req.query.ploggingCntPerPage; // 한 페이지에 보여줄 산책이력 수
    let currentPageNumber = req.query.pageNumber; // 조회할 페이지 Number
    // default -> 각 페이지에 4개씩, 1번 페이지 조회
    if (!ploggingCntPerPage) ploggingCntPerPage = 4;
    if (!currentPageNumber) currentPageNumber = 1;

    let searchType = Number(req.query.searchType); // 최신순(0), 점수순(1), 모은 쓰레기 순(2)
    let query = { "meta.user_id": targetUserId };
    let sort_option = [{ "meta.created_time": -1 },
    { "meta.plogging_total_score": -1 },
    { "meta.plogging_trash_count": -1 }];
    let options = {
        sort: sort_option[searchType],
        skip: (currentPageNumber - 1) * ploggingCntPerPage,
        limit: ploggingCntPerPage
    }

    const [allPloggingCount, plogging_list] = await PloggingSchema.readPloggingsModel(query, options, targetUserId);

    const meta = {};
    meta.startPageNumber = 1;
    meta.endPageNumber = pagingHelper.calcLastPage(allPloggingCount, ploggingCntPerPage);
    meta.currentPageNumber = currentPageNumber;

    returnResult.meta = meta;
    returnResult.plogging_list = plogging_list;

    res.status(200).json(returnResult);
}

/**
 * 산책 이력 등록
 * - img는 optional. 만약, 입력안하면 baseImg로 세팅
 */
const writePlogging = async function (req, res) {
    logger.info("plogging write api !");
    logger.info(logHelper.reqWrapper(req, "plogging"));

    let returnResult = { rc: 200, rcmsg: "success" };
    const userId = req.userId;
    let ploggingObj = req.body.ploggingData;
    ploggingObj = JSON.parse(ploggingObj);

    validatePloggingData(ploggingObj); // 산책 데이터 validation check

    ploggingObj.meta.user_id = userId;
    ploggingObj.meta.created_time = util.getCurrentDateTime();

    const ploggingScoreArr = calcPloggingScore(ploggingObj);
    const ploggingTotalScore = Number(ploggingScoreArr[0] + ploggingScoreArr[1]);
    const ploggingDistance = ploggingObj.meta.distance;
    const pickList = ploggingObj.trash_list;
    const pickCount = calPickCount(pickList);
    ploggingObj.meta.plogging_total_score = ploggingTotalScore;
    ploggingObj.meta.plogging_trash_count = pickCount;

    //이미지가 없을때는 baseImg insert
    if (req.file === undefined) ploggingObj.meta.plogging_img = `${process.env.SERVER_REQ_INFO}/plogging/baseImg.PNG`;
    else ploggingObj.meta.plogging_img = process.env.SERVER_REQ_INFO + '/' + req.file.path.split(`${process.env.IMG_FILE_PATH}/`)[1];

    // mongodb update
    await PloggingSchema.writePloggingModel(ploggingObj);

    // redis update
    await RankSchema.updateScore(userId, ploggingTotalScore);
    await RankSchema.updateDistance(userId, ploggingDistance);
    await RankSchema.updateTrash(userId, pickCount);
    res.status(200).json(returnResult);
}

/*
 * 산책 이력삭제
 *  ->산책이력의 objectId값을 파라미터로 전달
 *   
 */
const deletePlogging = async function (req, res) {
    logger.info("plogging delete api !");
    logger.info(logHelper.reqWrapper(req, "plogging"));

    let returnResult = { rc: 200, rcmsg: "success" };
    let userId = req.userId;
    let ploggingId = req.query.ploggingId;
    let ploggingImgName = req.query.ploggingImgName; // plogging_20210106132743.PNG
    let ploggingImgPath = `${ploggingFilePath}${userId}/${ploggingImgName}`;
    
    // 지울 산책이력 조회
    const ploggingObj = await PloggingSchema.readPloggingModel(ploggingId);

    const ploggingTotalScore = ploggingObj.meta.plogging_total_score;
    const ploggingDistance = ploggingObj.meta.distance;
    const pickCount = ploggingObj.meta.plogging_trash_count;

    // 산책이력 삭제
    await PloggingSchema.deletePloggingModel(ploggingId);

    // redis update
    await RankSchema.updateScore(userId, ploggingTotalScore*(-1));
    await RankSchema.updateDistance(userId, ploggingDistance*(-1));
    await RankSchema.updateTrash(userId, pickCount*(-1));

    // 산책이력 이미지 삭제
    if (fs.existsSync(ploggingImgPath)) fs.unlinkSync(ploggingImgPath);
    res.status(200).json(returnResult);
}

const getPloggingScore = async function (req, res) {
    logger.info("plogging getScore api !");
    logger.info(logHelper.reqWrapper(req, "plogging"));

    let returnResult = { rc: 200, rcmsg: "success" };
    const userId = req.userId;
    let ploggingObj = req.body.ploggingData;
    ploggingObj = JSON.parse(ploggingObj);

    validatePloggingData(ploggingObj);
    
    // 해당 산책의 plogging 점수
    const ploggingScoreArr = calcPloggingScore(ploggingObj);
    const ploggingTotalScore = Number(ploggingScoreArr[0] + ploggingScoreArr[1]);
    const ploggingActivityScore = Number(ploggingScoreArr[0]);
    const ploggingEnvironmentScore = Number(ploggingScoreArr[1]);

    returnResult.score = {};
    returnResult.score.totalScore = ploggingTotalScore;
    returnResult.score.activityScore = ploggingActivityScore;
    returnResult.score.environmentScore = ploggingEnvironmentScore;
    res.status(200).json(returnResult);
};

// 산책 점수 계산 ( 운동점수, 환경점수 )
function calcPloggingScore(ploggingObj) {
    let score = []; // score[0]: 운동점수, score[1]: 환경점수
    const pivotDistance = 300; // 300m
    const movePerScore = 1; // 10m 이동시 1점 증가
    const maxCountDistance = 10000; // 10km
    const pickPerScore = 10; // 쓰레기 1개 주울때마다 10점 증가

    const distance = ploggingObj.meta.distance; // 플로깅 거리
    const pickList = ploggingObj.trash_list; // 주운 쓰레기 리스트

    if (distance < pivotDistance) score[0] = 0; //300m 이하는 거리점수 없음
    else {
        if (maxCountDistance < distance) distance = maxCountDistance; // 10km 넘어가면 그 이상 거리점수 없음
        score[0] = ((Math.floor(distance / 10)) * movePerScore) + addExtraScorePerKm(distance);
    }

    let pickCount = 0;
    for (let i = 0; i < pickList.length; i++) pickCount += pickList[i].pick_count;
    score[1] = pickCount * pickPerScore;

    return score;
};

// 1km 마다 기본점수 폭 늘려준다. 해당 거리의 경우 추가되는 총 점수
function addExtraScorePerKm(distance) {
    const hopCnt = Math.floor(distance / 1000);
    let extraScore = 0;
    for (let i = 1; i <= hopCnt; i++) extraScore += (i * 10);
    return extraScore;
}

// 쓰레기 주운갯수 계산
function calPickCount(pickList) {
    let pickCount = 0;
    for (let i = 0; i < pickList.length; i++) pickCount += pickList[i].pick_count;
    return pickCount;
}

// 산책이력 값 validation check
/**
 * 
 * @param {*} ploggingObj 
 *   type -> jsonString
 * 
 *  {
 *    "meta": {
 *       "distance": 2000,
 *       "calorie": 200,
 *       "plogging_time": 20
 *    },
 *    "trash_list" : [
 *      { "trash_type": 2, "pick_count": 100}, {"trash_type": 1, "pick_count": 200}
 *     ]
 *  }
 */
function validatePloggingData(ploggingObj) {

    const meta = ploggingObj.meta;
    const trashList = ploggingObj.trash_list;

    if(!meta.distance || !meta.calorie || !meta.plogging_time || !trashList) {
        throw new BadRequest('산책 meta 데이터를 확인해주세요.');
    }

    for (let i = 0; i < trashList.length; i++) {
        if(!trashList[i].trash_type || !trashList[i].pick_count) {
            throw new BadRequest('산책 trash_list 데이터를 확인해주세요.');
        }
    }
}

module.exports = {
    readPlogging,
    writePlogging,
    deletePlogging,
    getPloggingScore
};

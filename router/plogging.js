const express = require('express');
const cors=require('cors');
const fs = require('fs');
const { promisify } = require('util');
const util = require('../util/common.js');
const { ObjectId } = require('mongodb');
const filePath = process.env.IMG_FILE_PATH;

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
    router.get("/:searchType", (req, res) => this.readPlogging(req, res));// read
    router.post("/", upload.single('ploggingImg'), (req, res) => this.writePlogging(req, res)); // create
    router.delete("/", (req, res) => this.deletePlogging(req,res)); // delete

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
/**
* @swagger
 * /plogging:
 *   get:
 *     summary: 산책이력 가져오기
 *     tags: [Plogging]
 *     parameters:
 *       - in: header
 *         name: sessionKey
 *         type: string
 *         required: true
 *         description: 유저 SessionKey
 *       - in: query
 *         name: userId
 *         type: string
 *         required: false
 *         description: 조회할 유저 id
 *       - in: path
 *         name: searchType
 *         type: string
 *         enum: [0, 1, 2]
 *         required: true
 *         description: 조회 type ( 최신순 / 점수순 / 거리순)
 *     responses:
 *       200:
 *         description: Success 
 *         schema:
 *          type: object
 *          properties:
 *              rc:
 *                  type: number
 *                  example: 200
 *              rcmsg:
 *                  type: string
 *                  example: 산책이력 정보에 성공했습니다.
 *              plogging_list:
 *                  type: array
 *                  items:
 *                      type: object
 *                      properties:
 *                          _id:
 *                              type: string
 *                              example: "5ff53c3ff9789143b86f863b"
 *                          meta:
 *                              type: object
 *                              properties:
 *                                  user_id:
 *                                      type: string
 *                                      example: xowns4817@naver.com-naver
 *                                  create_time:
 *                                      type: string
 *                                      format: date-time
 *                                      example: 20210106132743
 *                                  distance:
 *                                      type: number
 *                                      example: 1500
 *                                  calories:
 *                                      type: numer
 *                                      example: 200
 *                                  plogging_time:
 *                                      type: number
 *                                      example: 20
 *                                  plogging_img:
 *                                      type: string
 *                                      example: "http://localhost:20000/plogging/xowns4817@naver.com-naver/plogging_20210106132743.PNG"
 *                                  plogging_total_score:
 *                                      type: number
 *                                      example: 100000
 *                                  plogging_activity_score:
 *                                      type: number
 *                                      example: 50000
 *                                  plogging_environment_score:
 *                                      type: number
 *                                      example: 50000
 *                          trash_list:
 *                              type: array
 *                              items:
 *                                  type: object
 *                                  properties:
 *                                      trash_type:
 *                                          type: integer
 *                                          exmaple: 2
 *                                      pick_count:
 *                                          type: integer
 *                                          example: 100
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
 *                     example: 파라미터 값을 확인해주세요.
 *       401:
 *         description: Unauthorized
 *         schema:
 *              type: object
 *              properties:
 *                  rc:
 *                      type: number
 *                      example: 401
 *                  rcmsg:
 *                      type: string
 *                      example: 권한이 없습니다.(로그인을 해주세요.)
 *       404:
 *         description: Bad Request(url error)
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 404
 *                 rcmsg:
 *                     type: string
 *                     example: 요청 url을 확인해 주세요.
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
 *                     example: 서버 오류.
 */
PloggingInferface.prototype.readPlogging = async function(req, res) {
    console.log("plogging read api !");

    let userId = req.userId;
    let searchType = req.params.searchType; // 최신순(0), 점수순(1), 거리순(2)
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
/**
 * @swagger
 * /plogging:
 *   post:
 *     summary: 산책 이력 등록하기
 *     tags: [Plogging]
 *     consumes:
 *      - multipart/form-data
 *     produces:
 *      - application/json
 *     parameters:
 *       - in: header
 *         name: sessionKey
 *         type: string
 *         required: true
 *         description: 유저 SessionKey
 *       - in: formData
 *         name: ploggingImg
 *         type: file
 *         description: 산책 인증샷
 *         required: false
 *       - in: formData
 *         name: ploggingData
 *         type: string
 *         required: true
 *         example : '{"meta": { "distance": 1500, "calorie": 200, "flogging_time":20}, "pick_list": [ { "trash_type": 2, "pick_count":100}, {"trash_type":1, "pick_count":200}] }'
 *         description: 산책이력 데이터
 * 
 *     responses:
 *       200:
 *         description: Success
 *         schema:
 *          type: object
 *          properties:
 *              plogging:
 *                  type: object
 *                  properties:
 *                      rc:
 *                          type: number
 *                          example: 200
 *                      rcmsg:
 *                          type: string
 *                          example: 산책이력 등록 성공
 *                      score:
 *                          type: object
 *                          properties:
 *                              totalScore:
 *                                  type: number
 *                                  example: 3200
 *                              activityScore:
 *                                  type: number
 *                                  example: 3000
 *                              environmentScore:
 *                                  type: number
 *                                  example: 200            
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
 *                     example: 파라미터 값을 확인해주세요.
 *       401:
 *          description: Unauthorized
 *          schema:
 *              type: object
 *              properties:
 *                  rc:
 *                      type: number
 *                      example: 401
 *                  rcmsg:
 *                      type: string
 *                      example: 권한이 없습니다.(로그인을 해주세요.)
 *       404:
 *         description: Bad Request(url error)
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 404
 *                 rcmsg:
 *                     type: string
 *                     example: 요청 url을 확인해 주세요.
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
 *                     example: 서버 오류.
 * 
 */
PloggingInferface.prototype.writePlogging = async function(req, res) {
    console.log("plogging write api !");

    let returnResult = { rc: 200, rcmsg: "success" };

    let userId = req.userId;
    let ploggingObj = req.body.ploggingData;
    
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
    if(req.file===undefined) ploggingObj.meta.plogging_img = `${process.env.SERVER_REQ_INFO}baseImg.PNG`;
    else ploggingObj.meta.plogging_img = `${process.env.SERVER_REQ_INFO}${userId}/plogging_${ploggingObj.meta.create_time}.PNG`;

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
        const queryKey = "plogging";
        const unlock = await this.lock("plogging-lock"); // redis lock
        let originScore = await this.redisClient.zscore(queryKey, userId);
       
        if(!originScore) originScore = Number(0);
        const resultScore = Number(originScore)+Number(ploggingTotalScore);
        await this.redisClient.zadd(queryKey, resultScore, userId); // 랭킹서버에 insert

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
/**
 * @swagger
 * /plogging:
 *   delete:
 *     summary: 산책 이력 삭제하기
 *     tags: [Plogging]
 *     parameters:
 *       - in: header
 *         name: userId
 *         type: string
 *         required: true
 *         description: 유저 SessionKey
 *       - in: query
 *         name: objectId
 *         type: string
 *         required: false
 *         example: "5ff53c3ff9789143b86f863b"
 *         description: 산책이력 식별키
 *     responses:
 *       200:
 *         description: Success
 *         schema:
 *          type: object
 *          properties:
 *             plogging:
 *              type: object
 *              properties:
 *                  rc:
 *                      type: number
 *                      example: 200
 *                  rcmsg:
 *                      type: string
 *                      example: 산책이력 삭제 성공
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
 *                     example: 파라미터 값을 확인해주세요.
 *       401:
 *          description: Unauthorized
 *          schema:
 *              type: object
 *              properties:
 *                  rc:
 *                      type: number
 *                      example: 401
 *                  rcmsg:
 *                      type: string
 *                      example: 권한이 없습니다.(로그인을 해주세요)
 *       404:
 *         description: Bad Request(url error)
 *         schema:
 *             type: object
 *             properties:
 *                 rc:
 *                     type: number
 *                     example: 404
 *                 rcmsg:
 *                     type: string
 *                     example: 요청 url을 확인해 주세요.
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
 *                     example: 서버 오류.
 * 
 */
PloggingInferface.prototype.deletePlogging = async function(req, res) {
    console.log("plogging delete api !");

    let userId = req.userId;
    let mongoObjectId = req.query.objectId;
    let ploggingImgPath = req.query.ploggingImgPath;
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
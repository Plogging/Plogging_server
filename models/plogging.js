const MongoPool = require('../config/mongoConfig.js');
const { ObjectId } = require('mongodb');
const logger = require('../util/logger.js');
const PloggingSchema = {};
const dbName = 'plogging';
const collectionName = 'record';

// 산책 조회 (여러개)
PloggingSchema.readPloggingsModel = async function (query, options, targetUserId) {
    const mongoConnection = await MongoPool.db(dbName);
    const allPloggingCount = await mongoConnection.collection(collectionName).find({ "meta.user_id": targetUserId }).count();
    const plogginList = await mongoConnection.collection(collectionName).find(query, options).toArray();
    return [allPloggingCount, plogginList];
};

// 산책 조회(1개 - 삭제 목적)
PloggingSchema.readPloggingModel = async function (ploggingId) {
    const mongoConnection = await MongoPool.db(dbName);
    const query = { _id: ObjectId(ploggingId) };
    const ploggingObj = await mongoConnection.collection(collectionName).findOne(query);
    return ploggingObj;
};

// 산책 등록
PloggingSchema.writePloggingModel = async function (ploggingObj) {
    const mongoConnection = await MongoPool.db(dbName);
    await mongoConnection.collection(collectionName).insertOne(ploggingObj);
};

// 산책 삭제
PloggingSchema.deletePloggingModel = async function (ploggingId) {
    const mongoConnection = await MongoPool.db(dbName);
    const query = { _id: ObjectId(ploggingId) };
    await mongoConnection.collection(collectionName).deleteOne(query);
};

// 사용자 산책 기록 삭제
PloggingSchema.deletePloggingsModel = async function (userId) {
    const mongoConnection = await MongoPool.db(dbName);
    const query = { 'meta.user_id': userId };
    await mongoConnection.collection(collectionName).deleteMany(query);
};

/*
 db.record.aggregate(
     [{
         '$match': { "meta.user_id" : "xowns4817@naver.com:naver",
          "meta.created_time" : {"$gt": "20210401", "$lt": "20210411"}}},
          {
              $group: {_id : null,
                       totalScore:{$sum: '$meta.plogging_total_score'},
                       totalDistance:{$sum: '$meta.distance'},
                       totalTrash:{$sum: '$meta.plogging_trash_count'
                  }
              }
          }
      ]
  );
  -> { "_id" : null, "totalScore" : 6340, "totalDistance" : 3000, "totalTrash" : 600 }
*/

// 해당 주, 월 산책데이터 합산 (점수, 거리, 쓰레기 주운 수) -> mongodb aggregation 사용해야 될듯
// 시작, 종료 날짜 입력하면 해당 날짜의 산책 점수, 거리, 주운수 총합 리턴
PloggingSchema.sumPloggingData = async function (userId, startDate, endDate) {
    const mongoConnection = await MongoPool.db(dbName);
    const matchQuery = { $match: { "meta.user_id": userId, "meta.created_time": { $gt: startDate, $lt: endDate } } };
    const groupQuery = {
        $group: {
            "_id": null,
            totalScore: { $sum: "$meta.plogging_total_score" },
            totalDistance: { $sum: "$meta.distance"},
            totalTrash: { $sum: "$meta.plogging_trash_count"}
        }
    }
    const [totalScore, totalDistance, totalTrash] = await mongoConnection.collection(collectionName).aggregate(matchQuery, groupQuery);
    return [totalScore, totalDistance, totalTrash];
};

module.exports = PloggingSchema;


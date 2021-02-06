const MongoPool = require('../config/mongoConfig.js');
const { ObjectId } = require('mongodb');
const logger = require('../util/logger.js');
const PloggingSchema = {};
const dbName = 'plogging';
const collectionName = 'record';

// 산책 조회
PloggingSchema.readPloggingModel = async function (query, options, targetUserId) {
    const mongoConnection = await MongoPool.db(dbName);
    const allPloggingCount = await mongoConnection.collection(collectionName).find({ "meta.user_id": targetUserId }).count();
    const plogginList = await mongoConnection.collection(collectionName).find(query, options).toArray();
    return [allPloggingCount, plogginList];
};

// 산책 등록
PloggingSchema.writePloggingModel = async function (ploggingObj) {
    const mongoConnection = await MongoPool.db(dbName);
    await mongoConnection.collection(collectionName).insertOne(ploggingObj);
};

// 산책 삭제
PloggingSchema.deletePloggingModel = async function (ploggingId) {
    const mongoConnection = await MongoPool.db(dbName);
    const query = { "_id": ObjectId(ploggingId) };
    await mongoConnection.collection(collectionName).deleteOne(query);
};

// 사용자 산책 기록 삭제
PloggingSchema.deletePloggingsModel = async function(userId) {
    const mongoConnection = await MongoPool.db(dbName);
    const query = {'meta.user_id': userId};
    await mongoConnection.collection(collectionName).deleteMany(query);
};

module.exports = PloggingSchema;


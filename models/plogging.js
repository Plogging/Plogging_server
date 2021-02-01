const MongoPool = require('../config/mongoConfig.js');
const { ObjectId } = require('mongodb');
const PloggingSchema = { };
const dbName = 'plogging';
const collectionName = 'record';

// 산책 조회
PloggingSchema.readPloggingModel = async function(query, options) {
    let mongoConnection = await MongoPool.db(dbName);
    return await mongoConnection.collection(collectionName).find(query,options).toArray();
};

// 산책 등록
PloggingSchema.writePloggingModel = async function(ploggingObj) {
    let mongoConnection = await MongoPool.db(dbName);
    await mongoConnection.collection(collectionName).insertOne(ploggingObj);
};

// 산책 삭제
PloggingSchema.deletePloggingModel = async function(ploggingId) {
    let mongoConnection = await MongoPool.db(dbName);
    const query = {"_id": ObjectId(ploggingId)};
    await mongoConnection.collection(collectionName).deleteOne(query);
};

module.exports = PloggingSchema;


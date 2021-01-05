/**
 * MongoClient는 내부적으로 connection pooling을 이용한다. ( default 5개 )
 * connection release를 어떻게 해줘야되는지 ? 
 * 참고 - https://hot-time.tistory.com/160
 */

 const { MongoClient } = require('mongodb'); 
const url = "mongodb://localhost:27017/";
const client = new MongoClient(url, {useUnifiedTopology: true});

module.exports = client;
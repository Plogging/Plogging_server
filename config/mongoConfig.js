/**
 * MongoClient는 내부적으로 connection pooling을 이용한다. ( default 5개 )
 * connection release를 어떻게 해줘야되는지 ? 
 * 참고 - https://hot-time.tistory.com/160
 */
const { MongoClient } = require('mongodb'); 
const jasypt = require('../util/common_jasypt.js');
const mongoPassword = jasypt.decrypt(process.env.MONGODB_PASSWORD);
const url = `mongodb://root:${mongoPassword}@${process.env.MONGODB_INFO}`;

const client = new MongoClient(url, {
    useUnifiedTopology: true,
    'native_parser':true,
    'poolSize':3, // 초기 pool을 3개로 지정. -> maxPoolSize가 5이므로 커넥션 3개를 모두 쓰고있을대는 5개까지는 늘어난다.
    'maxPoolSize': 5 // 커넥션 pool에 최대 5개 커넥션 수용가능
});

module.exports = client;

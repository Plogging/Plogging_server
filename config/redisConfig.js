//const redis = require('redis');
const redis = require('ioredis');
const redisInfo = process.env.REDIS_INFO;
const ip = redisInfo.split(":")[0];
const port = redisInfo.split(":")[1];
const jasypt = require('../util/common_jasypt.js');
const redisPassword = jasypt.decrypt(process.env.REDIS_PASSWORD);

const redisClient = redis.createClient({  
	host: ip,
	port: port,
	db: 0,
	password: "dkwmfrjdns1!"
});

module.exports =  redisClient;
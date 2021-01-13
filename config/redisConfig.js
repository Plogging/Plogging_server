//const redis = require('redis');
const redis = require('ioredis');
const redisInfo = process.env.REDIS_INFO;
const ip = redisInfo.split(":")[0];
const port = redisInfo.split(":")[1];

const redisClient = redis.createClient({  
	host: ip,
	port: port
});

module.exports =  redisClient;
const redis = require('redis');
// const redisCilent = redis.createClient({  
// 	host: "121.130.220.217",
// 	port: 40000,
// 	password: "dkwmfrjdns1!"
// });

const redisCilent = redis.createClient(6379,'localhost');

module.exports =  redisCilent;
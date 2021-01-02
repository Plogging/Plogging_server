const redis = require('redis');
const redisCilent = redis.createClient({  
	host: "127.0.0.1",
	port: 6379
});

module.exports =  redisCilent;
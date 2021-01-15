const mysql = require('mysql'); // callback용
const mysql2 = require('mysql2'); // async await 용
const mariadbInfo = process.env.MARIADB_INFO;
const ip = mariadbInfo.split(":")[0];
const port = mariadbInfo.split(":")[1];
const jasypt = require('../util/common_jasypt.js');
const dbPassword = jasypt.decrypt(process.env.MARIADB_PASSWORD);

//커넥션 연결
let dbConfig = {
    host: ip,
    port: port,
    user: "root",
    password: dbPassword,
    database: "plogging",
    multipleStatements : true,
    connectionLimit: 10
};

module.exports.getMysqlPool=mysql.createPool(dbConfig);
module.exports.getMysqlPool2=mysql2.createPool(dbConfig);

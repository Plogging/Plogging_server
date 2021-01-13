const mysql = require('mysql'); // callback용
const mysql2 = require('mysql2'); // async await 용

//커넥션 연결
let dbConfig = {
    host: "127.0.0.1",
    port: "3306",
    user: "root",
    password: "kim414gh8020",
    database: "plogging",
    multipleStatements : true,
    connectionLimit: 10
};

module.exports.getMysqlPool=mysql.createPool(dbConfig);
module.exports.getMysqlPool2= mysql2.createPool(dbConfig);
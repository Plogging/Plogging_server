let mysql = require('mysql'); // callback용
const mysql2 = require('mysql2/promise'); // async await 용

//커넥션 연결
let dbConfig = {
    host: "localhost",
    port: "3306",
    user: "root",
    password: "password",
    database: "디비 이름",
    multipleStatements : true,
    connectionLimit: 50
};

module.exports.getMysqlPool=mysql.createPool(dbConfig);
module.exports.getMysql2Pool=mysql2.createPool(dbConfig);
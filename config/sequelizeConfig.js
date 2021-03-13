const fs = require('fs');
const [ip, port] = process.env.MARIADB_INFO.split(":");
const jasypt = require('../util/common_jasypt.js');
const dbPassword = jasypt.decrypt(process.env.MARIADB_PASSWORD);

module.exports = {
  local: {
    username: 'root',
    password: dbPassword,
    database: 'plogging',
    host: ip,
    port: port,
    timezone: '+09:00',
    dialect: 'mysql',
    dialectOptions: {
      bigNumberStrings: true
    },
    define: {
      freezeTableName: true
    }
  },
  development: {
    username: 'root',
    password: dbPassword,
    database: 'plogging',
    host: ip,
    port: port,
    timezone: '+09:00',
    dialect: 'mysql',
    dialectOptions: {
      bigNumberStrings: true
    }
  },
  production: {
    username: 'root',
    password: dbPassword,
    database: 'plogging',
    host: ip,
    port: port,
    dialect: 'mysql',
    timezone: '+09:00',
    dialectOptions: {
      bigNumberStrings: true,
    }
  }
};

const Jasypt = require('jasypt');
const jasypt = new Jasypt();

jasypt.setPassword(process.env.APP_ENCRYPTION_PASSWORD); // os 환경변수에 저장

/*
const encryptMsg = jasypt.encrypt('dkwmfrjdns1!');  // JjaoSaoP+IRVDBkXdDR4XMgTmkMut0VM
console.log(encryptMsg);
const decryptMsg = jasypt.decrypt(encryptMsg);
console.log(decryptMsg);
*/

module.exports = jasypt;
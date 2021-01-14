const Jasypt = require('jasypt');
const jasypt = new Jasypt();
jasypt.setPassword('plogging-pw');

/*
const encryptMsg = jasypt.encrypt('admin');  // JjaoSaoP+IRVDBkXdDR4XMgTmkMut0VM
console.log(encryptMsg);
// 解密
const decryptMsg = jasypt.decrypt(encryptMsg);
console.log(decryptMsg);
*/

module.exports = jasypt;
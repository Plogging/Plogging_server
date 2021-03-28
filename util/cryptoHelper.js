const crypto = require('crypto');

module.exports = {
    salt: () => crypto.randomBytes(32).toString('hex'),
    digest: (secretKey, salt) => crypto.pbkdf2Sync(secretKey, salt, 10000, 64, 'sha512').toString('base64')
}
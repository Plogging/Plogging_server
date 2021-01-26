const fs = require('fs');
const filePath = process.env.IMG_FILE_PATH;
const ploggingFilePath = process.env.IMG_FILE_PATH + '/plogging/';
const multer = require('multer');

const profileUpload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            const userId = req.userId; // 세션체크 완료하면 값 받아옴
            const dir = `${filePath}/${userId}`;
            if(!fs.existsSync(filePath)){
                fs.mkdirSync(filePath);
            }
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            cb(null, dir);
        },
        filename: function (req, file, cb) {
            cb(null, `profileImg.PNG`);
        }
    }),
    limits: {fileSize: 1*1000*5000}, // file upload 5MB 제한
});

const plogFileUpload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            const userId = req.userId; // 세션체크 완료하면 값 받아옴
            const dir = `${ploggingFilePath}${userId}`;
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir);
            }
            cb(null, dir);
        },
        filename: function (req, file, cb) {
            cb(null, `plogging_${util.getCurrentDateTime()}.PNG`);
        }
    }),
    limits: {fileSize: 1*1000*5000}, // file upload 5MB 제한
});

module.exports = {
    profileUpload,
    plogFileUpload
}
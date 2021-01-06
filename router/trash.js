const express = require('express');
const cors=require('cors');
const { default: axios } = require('axios');
const fs = require('fs');
const util = require('../util/common.js');

const TrashInferface = function(config) {
    const router = express.Router();
    router.all('*',cors());

    this.router = router;
    this.mysqlPool = config.mysqlPool;
    this.mysqlPool2 = config.mysqlPool2;
    this.redisClient = config.redisClient;
    this.MongoPool = config.MongoPool;
    this.fileInterface = config.fileInterface;

    const upload = this.fileInterface({
        storage: this.fileInterface.diskStorage({
          destination: function (req, file, cb) {
            const userId = req.body.userId; // 세션체크 완료하면 값 받아옴
            const dir = `E:/file_test/trash/${userId}`;

            if (!fs.existsSync(dir)){
                console.log(dir);
                fs.mkdirSync(dir);
            }
            cb(null, dir);
          },
          filename: function (req, file, cb) {
            cb(null, `flogging_${util.getCurrentDateTime()}.PNG`);
          }
        }),
        limits: {fileSize: 1*1000*5000}, // file upload 5MB 제한
      })

    // 쓰레기 관련 api 구현
    router.get("/", (req, res) => this.readTrash(req, res));// read
    router.post("/", upload.single('trashImg'), (req, res) => this.writeTrash(req, res)); // create
    return this.router;
};

TrashInferface.prototype.readTrash = async function(req, res) {
    console.log("trash read api !");

    let query = {"meta.user_id": "xowns4817@naver.com-naver"};
    let options = {sort: {"meta.created_time": -1}}; // 최신순
    let mongoConnection = null;

    try {
        mongoConnection = this.MongoPool.db('test');
        let trash = await mongoConnection.collection('trash').find(query, options).toArray();
        res.send(trash);
    } catch(e) {
        console.log(e);
    } finally {
        mongoConnection=null;
    }
}

TrashInferface.prototype.writeTrash = async function(req, res) {
    console.log("trash write api !");

    let trashObj = { };
    let userId = req.body.userId;
    let trashImg = req.file;

    trashObj.meta = { };
    trashObj.meta.user_id = userId;
    trashObj.meta.create_time = util.getCurrentDateTime();
    trashObj.meta.distance = 1.5;
    trashObj.meta.calorie = 200;
    trashObj.meta.flogging_time = 20;

    trashObj.meta.trash_img = `http://localhost:20000/trash/${userId}/flogging_${trashObj.meta.create_time}.PNG`; // file server 찔러서 이미지 가져옴
    

    trashObj.trash_list = [ ];
    trashObj.trash_list[0] = {"trash_type": 2, "pick_count": 100};
    trashObj.trash_list[1] = {"trash_type": 1, "pick_count": 200};

    let mongoConnection = null;
   // const form = new FormData(); // multipart/form-data
   // form.append('userId', trashObj.meta.user_id);
   // form.append('profileImge', profileImg)

    try {
    
    // file server post request -> node 내부에서 처리
    //const response = await axios.post('http://localhost:8080/upload/profileImg', form);
    //console.log(response);
    
        mongoConnection = this.MongoPool.db('test');
        await mongoConnection.collection('trash').insertOne(trashObj);
    } catch(e) {
        console.log(e);
    } finally {
        mongoConnection=null;
    }
}


module.exports = TrashInferface;
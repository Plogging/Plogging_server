const router = require('express').Router();
const cors=require('cors');
const swaggerValidation = require('../util/validator');
const userControlsV2 = require('../controllers_v2/userControllers.js');
const upload = require('../util/multerHelper').profileUpload;
const errHandler = require('../util/errHandler')

router.all('*',cors());

// v2 api

module.exports = router;
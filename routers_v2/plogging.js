const router = require('express').Router();
const cors=require('cors');
const swaggerValidation = require('../util/validator')
const upload = require('../util/multerHelper').plogFileUpload;
const ploggingControlsV2 = require('../controllers_v2/ploggingControllers.js');
const errHandler = require('../util/errHandler')

router.all('*',cors());

// v2 api

module.exports = router;
 
const router = require('express').Router()
const cors = require('cors');
const swaggerValidation = require('../util/validator')
const { getGlobalRankV2, getUserRankV2 } = require('../controllers_v2/rankingControllers');
const errHandler = require('../util/errHandler')

router.all('*', cors())

// v2 api

module.exports = router
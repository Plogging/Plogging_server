const router = require('express').Router()
const cors = require('cors');
const swaggerValidation = require('../util/validator')
const { getGlobalRank, getUserRank } = require('../controllers/rankingControllers');
const { getGlobalRankV2, getUserRankV2 } = require('../controllers_v2/rankingControllers');
const errHandler = require('../util/errHandler')

router.all('*', cors())

// v1 api
router.get("/global", swaggerValidation.validate, errHandler(getGlobalRank))
router.get("/users/:id", swaggerValidation.validate, errHandler(getUserRank))

// v2 api

module.exports = router
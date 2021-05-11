const router = require('express').Router()
const cors = require('cors');
const swaggerValidation = require('../util/validator')
const { getGlobalRank, getUserRank } = require('../controllers/rankingControllers');
const errHandler = require('../util/errHandler')

router.all('*', cors())

// v1 api
router.get("/global", swaggerValidation.validate, errHandler(getGlobalRank))
router.get("/users/:id", swaggerValidation.validate, errHandler(getUserRank))


module.exports = router
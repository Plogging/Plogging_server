const router = require('express').Router()
const cors = require('cors');
const swaggerValidation = require('../util/validator')
const { getGlobalRank, getUserRank } = require('../controllers/rankingControllers')

router.all('*', cors())

router.get("/global", swaggerValidation.validate, getGlobalRank)
router.get("/users/:id", swaggerValidation.validate, getUserRank)

module.exports = router
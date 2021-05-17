const router = require('express').Router();
const cors=require('cors');
const swaggerValidation = require('../util/validator');
const authControlsV2 = require('../controllers_v2/authControllers.js');
const errHandler = require('../util/errHandler')

router.all('*',cors());

// v2 api
router.post('/sign-in', swaggerValidation.validate, errHandler(authControlsV2.signIn));
router.get('/sign-out', swaggerValidation.validate, errHandler(authControlsV2.signOut));

module.exports = router;
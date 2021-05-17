const router = require('express').Router();
const cors=require('cors');
const swaggerValidation = require('../util/validator');
const userControlsV2 = require('../controllers_v2/userControllers.js');
const upload = require('../util/multerHelper').profileUpload;
const errHandler = require('../util/errHandler')

router.all('*',cors());

// v2 api
router.post('', swaggerValidation.validate, errHandler(userControlsV2.register));
router.delete('', swaggerValidation.validate, errHandler(userControlsV2.withdrawal));
router.put('', upload.single('profileImg'), swaggerValidation.validate, errHandler(userControlsV2.changeUserInfo));
router.head('/:id', swaggerValidation.validate, errHandler(userControlsV2.checkUserId));
router.get('/:id', swaggerValidation.validate, errHandler(userControlsV2.getUserInfo));

module.exports = router;
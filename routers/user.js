const router = require('express').Router();
const cors=require('cors');
const swaggerValidation = require('../util/validator');
const userControls = require('../controllers/userControllers.js')
const upload = require('../util/multerHelper').profileUpload;
const errHandler = require('../util/errHandler')

router.all('*',cors());

router.post('/sign-in', swaggerValidation.validate, errHandler(userControls.signIn));
router.post('/social', swaggerValidation.validate, errHandler(userControls.social));
router.post('', swaggerValidation.validate, errHandler(userControls.register));
router.post('/check', swaggerValidation.validate, errHandler(userControls.checkUserId));
router.get('/:id', swaggerValidation.validate, errHandler(userControls.getUserInfo));
router.post('/apple', swaggerValidation.validate, errHandler(userControls.appleSignIn));
router.put('/name', swaggerValidation.validate, errHandler(userControls.changeUserName));
router.put('/image', upload.single('profileImg'), swaggerValidation.validate, errHandler(userControls.changeUserImage));
router.put('/password', swaggerValidation.validate, errHandler(userControls.changePassword));
router.put('/password-temp', swaggerValidation.validate, errHandler(userControls.temporaryPassword));
router.put('/sign-out', swaggerValidation.validate, errHandler(userControls.signOut));
router.delete('', swaggerValidation.validate, errHandler(userControls.withdrawal));

module.exports = router;
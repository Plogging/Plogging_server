const router = require('express').Router();
const cors=require('cors');
const swaggerValidation = require('../util/validator');
const userControls = require('../controllers/userControllers.js')
const upload = require('../util/multerHelper').profileUpload;

router.all('*',cors());

router.post('/sign-in', swaggerValidation.validate, userControls.signIn);
router.post('/social', swaggerValidation.validate, userControls.social);
router.post('', swaggerValidation.validate, userControls.register);
router.post('/check', swaggerValidation.validate, userControls.checkUserId);
router.get('/:id', swaggerValidation.validate, userControls.getUserInfo);
router.put('/name', swaggerValidation.validate, userControls.changeUserName);
router.put('/image', upload.single('profileImg'), swaggerValidation.validate, userControls.changeUserImage);
router.put('/password', swaggerValidation.validate, userControls.changePassword);
router.put('/password-temp', swaggerValidation.validate, userControls.temporaryPassword);
router.put('/sign-out', swaggerValidation.validate, userControls.signOut);
router.delete('', swaggerValidation.validate, userControls.withdrawal);

module.exports = router;
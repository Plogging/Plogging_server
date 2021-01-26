const router = require('express').Router();
const cors=require('cors');
const swaggerValidation = require('../util/validator');
const userControls = require('../controllers/userControllers.js')
const upload = require('../util/multerHelper').profileUpload;

router.all('*'  ,cors());

router.post('/sign-in', swaggerValidation.validate, (req, res) => userControls.signIn(req, res));
router.post('/social', swaggerValidation.validate, (req, res) => userControls.social(req, res));
router.post('', swaggerValidation.validate, (req, res) => userControls.register(req, res));
router.post('/check', swaggerValidation.validate, (req, res) => userControls.checkUserId(req, res));
router.get('/:id', swaggerValidation.validate, (req, res) => userControls.getUserInfo(req, res));
router.put('/name', swaggerValidation.validate, (req, res) => userControls.changeUserName(req, res));
router.put('/image', upload.single('profileImg'), swaggerValidation.validate, (req, res) => userControls.changeUserImage(req, res));
router.put('/password', swaggerValidation.validate, (req, res) => userControls.changePassword(req, res));
router.put('/password-temp', swaggerValidation.validate, (req, res) => userControls.temporaryPassword(req, res));
router.put('/sign-out', swaggerValidation.validate, (req, res) => userControls.signOut(req, res));
router.delete('', swaggerValidation.validate, (req, res) => userControls.withdrawal(req, res));

module.exports = router;
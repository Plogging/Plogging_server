const router = require('express').Router();
const cors=require('cors');
const swaggerValidation = require('../util/validator')
const upload = require('../util/multerHelper').plogFileUpload;
const ploggingControls = require('../controllers/ploggingControllers.js');
const errHandler = require('../util/errHandler')

router.all('*',cors());

router.get("/:targetUserId", swaggerValidation.validate, errHandler(ploggingControls.readPlogging));// read
router.post("/", upload.single('ploggingImg'), swaggerValidation.validate, errHandler(ploggingControls.writePlogging)); // create
router.delete("/", swaggerValidation.validate, errHandler(ploggingControls.deletePlogging)); // delete
router.post('/score', swaggerValidation.validate, errHandler(ploggingControls.getPloggingScore)); // get plogging score

module.exports = router;

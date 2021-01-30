const router = require('express').Router();
const cors=require('cors');
const swaggerValidation = require('../util/validator')
const upload = require('../util/multerHelper').plogFileUpload;
const ploggingControls = require('../controllers/ploggingControllers.js');

router.all('*',cors());

router.get("/:targetUserId", swaggerValidation.validate, ploggingControls.readPlogging);// read
router.post("/", upload.single('ploggingImg'), swaggerValidation.validate, ploggingControls.writePlogging); // create
router.delete("/", swaggerValidation.validate, ploggingControls.deletePlogging); // delete

module.exports = router;

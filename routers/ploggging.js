const router = require('express').Router();
const cors=require('cors');
const swaggerValidation = require('../util/validator')
const upload = require('../util/multerHelper').profileUpload;
const ploggingControls = require('../controllers/ploggingControllers.js');

router.all('*',cors());

router.get("/:targetUserId", swaggerValidation.validate, (req, res) => ploggingControls.readPlogging(req, res));// read
router.post("/", upload.single('ploggingImg'), swaggerValidation.validate, (req, res) => ploggingControls.writePlogging(req, res)); // create
router.delete("/", swaggerValidation.validate, (req, res) => ploggingControls.deletePlogging(req,res)); // delete

module.exports = router;

const express = require('express');
const router = express.Router();

const guideController = require('../controllers/guideController');
const jwtMiddleware = require("../middlewares/jwtMiddleware");
router.get('/:id', jwtMiddleware.verifyToken, guideController.getGuideByIdController);

router.get('/', jwtMiddleware.verifyToken, guideController.getAllGuidesController);

module.exports = router;

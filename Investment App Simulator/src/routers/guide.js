const express = require('express');
const router = express.Router();

const guideController = require('../controllers/guideController');
const jwtMiddleware = require("../middlewares/jwtMiddleware");
router.get('/:id', jwtMiddleware.verifyToken, guideController.getGuideByIdController);


module.exports = router;

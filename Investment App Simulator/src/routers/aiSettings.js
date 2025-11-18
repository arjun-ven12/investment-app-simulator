const express = require("express");
const router = express.Router();
const aiSettingsController = require("../controllers/aiSettingsController");
const jwtMiddleware = require("../middlewares/jwtMiddleware");

// GET AI settings
router.get("/", jwtMiddleware.verifyToken, aiSettingsController.getAISettings);

// UPDATE AI settings
router.post("/", jwtMiddleware.verifyToken, aiSettingsController.updateAISettings);

module.exports = router;

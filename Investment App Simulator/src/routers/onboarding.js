// routes/onboardingRoutes.js
const express = require("express");
const router = express.Router();
const jwtMiddleware = require("../middlewares/jwtMiddleware");
const onboardingController = require("../controllers/onboardingController");

router.get("/status", jwtMiddleware.verifyToken, onboardingController.getStatus);

// Update just the stage
router.post("/stage", jwtMiddleware.verifyToken, onboardingController.updateStage);

// Mark onboarding as permanently skipped
router.post("/never-show-again", jwtMiddleware.verifyToken, onboardingController.skipForever);

// Restart onboarding entirely
router.post("/reset", jwtMiddleware.verifyToken, onboardingController.restart);

module.exports = router;

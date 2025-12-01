const express = require("express");
const router = express.Router();
const jwtMiddleware = require("../middlewares/jwtMiddleware");
const onboardingController = require("../controllers/onboardingController");

// Main onboarding
router.get("/status", jwtMiddleware.verifyToken, onboardingController.getStatus);
router.post("/stage", jwtMiddleware.verifyToken, onboardingController.updateStage);
router.post("/never-show-again", jwtMiddleware.verifyToken, onboardingController.skipForever);
router.post("/reset", jwtMiddleware.verifyToken, onboardingController.restart);

// Scenario Console onboarding
router.post("/scenario/stage", jwtMiddleware.verifyToken, onboardingController.updateScenarioConsoleStage);
router.post("/scenario/never", jwtMiddleware.verifyToken, onboardingController.skipScenarioConsole);
router.post("/scenario/reset", jwtMiddleware.verifyToken, onboardingController.restartScenarioConsole);

module.exports = router;

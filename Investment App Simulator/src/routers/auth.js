const express = require("express");
const router = express.Router();
const { googleLogin, googleCallback } = require("../controllers/googleAuthController");
const { microsoftLogin, microsoftCallback } = require("../controllers/microsoftAuthController");

router.get("/google", googleLogin);
router.get("/google/callback", googleCallback);
router.get("/microsoft", microsoftLogin);
router.get("/microsoft/callback", microsoftCallback);
module.exports = router;

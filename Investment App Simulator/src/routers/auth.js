const express = require("express");
const router = express.Router();

const {
  googleLogin,
  googleCallback,
  acceptGoogleTerms,
} = require("../controllers/googleAuthController");
const {
  microsoftLogin,
  microsoftCallback,
} = require("../controllers/microsoftAuthController");

// GOOGLE
router.get("/google", googleLogin);
router.get("/google/callback", googleCallback);
router.post("/google/accept-terms", acceptGoogleTerms);

// MICROSOFT (unchanged)
router.get("/microsoft", microsoftLogin);
router.get("/microsoft/callback", microsoftCallback);

module.exports = router;

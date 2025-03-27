const express = require("express");
const router = express.Router();
const openAIController = require("../controllers/chatbotController");

router.post("/generate", openAIController.generateResponse);

module.exports = router;

const express = require("express");
const router = express.Router();
const aiAdviceController = require("../controllers/aiAdviceController");

router.get("/:userId", aiAdviceController.getAdvice);
router.get("/:userId/all", aiAdviceController.getAllAdvice);

module.exports = router;
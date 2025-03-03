const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');

router.get('/news', dashboardController.getNews);
router.patch('/news/:news_id', dashboardController.updateNewsCategory);

module.exports = router;
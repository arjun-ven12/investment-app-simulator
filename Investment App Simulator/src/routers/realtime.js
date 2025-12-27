
const express = require('express');
// const { getAllPersons } = require('../models/Person.model');
const router = express.Router();

const chartsController = require('../controllers/chartsController');


router.get('/related/:ticker', chartsController.getRelatedTickers);


router.get('/:symbol', chartsController.getStockChartRealData);

router.get('/movers/:direction', chartsController.getMarketMovers);

module.exports = router;

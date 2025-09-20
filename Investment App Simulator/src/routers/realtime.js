
const express = require('express');
// const { getAllPersons } = require('../models/Person.model');
const router = express.Router();

const chartsController = require('../controllers/chartsController');




router.get('/:symbol', chartsController.getStockChartRealData);


module.exports = router;

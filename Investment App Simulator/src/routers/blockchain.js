
const express = require('express');
// const { getAllPersons } = require('../models/Person.model');
const router = express.Router();

const blockchainController = require('../controllers/blockchainController');


//router.get("/trades", blockchainController.getStockTrades);
//router.get("/options", blockchainController.getOptionTrades);
router.get("/trades-unified", blockchainController.getUnifiedTrades);


module.exports = router;

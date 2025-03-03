const express = require('express');
const router = express.Router();
const { getAllStatus } = require('../models/Status.model');

// Create a new task
router.get('/', (req, res, next) => {
  getAllStatus()
    .then((statuses) => res.status(200).json(statuses))
    .catch(next);
});

module.exports = router;

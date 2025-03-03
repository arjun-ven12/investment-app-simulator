const express = require('express');
const { getProfile, updatePhoneNumber, deleteAccount } = require('../controllers/profileController');
const { verifyToken } = require('../middlewares/jwtMiddleware');

const router = express.Router();

// Route definitions
router.get('/', getProfile);
router.post('/update-phone', updatePhoneNumber);
router.post('/delete-account', deleteAccount);

module.exports = router;

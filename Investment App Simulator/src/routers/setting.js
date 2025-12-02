// src/routes/settingsRouter.js
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingController');
const jwtMiddleware = require("../middlewares/jwtMiddleware");

// all routes protected → make sure to apply JWT/auth middleware before this router
router.put('/change-email', jwtMiddleware.verifyToken, settingsController.changeEmail);
router.put('/change-password', jwtMiddleware.verifyToken, settingsController.changePassword);
router.put('/change-username', jwtMiddleware.verifyToken,settingsController.changeUsername);
router.delete('/delete-account', jwtMiddleware.verifyToken,settingsController.deleteAccount);
router.get('/me/auth-type', jwtMiddleware.verifyToken, settingsController.getAuthType);
router.post('/reset-wallet', jwtMiddleware.verifyToken, settingsController.resetWalletController);

module.exports = router;

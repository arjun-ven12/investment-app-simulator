const settingsModel = require('../models/setting');
const prisma = require('../../prisma/prismaClient');

// =====================
// CHANGE EMAIL
// =====================
module.exports.changeEmail = async (req, res) => {
    try {
        const userId = req.user.id; 
        const { newEmail, password } = req.body;

        if (!newEmail) {
            return res.status(400).json({ error: "New email is required" });
        }

        const result = await settingsModel.changeEmail(userId, newEmail, password);
        res.status(200).json(result);

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// =====================
// CHANGE PASSWORD
// =====================
module.exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        const result = await settingsModel.changePassword(userId, oldPassword, newPassword);
        res.status(200).json(result);

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// =====================
// CHANGE USERNAME
// =====================
module.exports.changeUsername = async (req, res) => {
    try {
        const userId = req.user.id;
        const { newUsername, password } = req.body;

        if (!newUsername) {
            return res.status(400).json({ error: "New username is required" });
        }

        const result = await settingsModel.changeUsername(userId, newUsername, password);
        res.status(200).json(result);

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// =====================
// DELETE ACCOUNT
// =====================
module.exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { password } = req.body;

        const result = await settingsModel.deleteAccount(userId, password);
        res.status(200).json(result);

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
module.exports.getAuthType = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                googleId: true,
                microsoftId: true,
                password: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        let authType;
        if (user.googleId) authType = "google";
        else if (user.microsoftId) authType = "microsoft";
        else authType = "local";

        return res.status(200).json({ authType });

    } catch (err) {
        console.error("Auth type error:", err);
        res.status(500).json({ error: "Server error" });
    }
};

////////////////////////////////////////////////////////////////////////////////
//////// SETTINGS - WALLET RESET
////////////////////////////////////////////////////////////////////////////////



exports.resetWalletController = function (req, res) {
  const userId = Number(req.query.userId);
  const { startingBalance } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  if (!startingBalance || isNaN(Number(startingBalance)) || Number(startingBalance) <= 0) {
    return res.status(400).json({ message: "Starting balance must be a positive number" });
  }

  return settingsModel
    .resetUserPortfolio(userId, Number(startingBalance))
    .then((updatedUser) => {
      return res.status(200).json({
        message: "Wallet and portfolio reset successfully",
        newBalance: updatedUser.wallet,
      });
    })
    .catch((error) => {
      console.error("Error resetting wallet and portfolio:", error);
      return res.status(500).json({
        message: "Error resetting wallet and portfolio",
        error,
      });
    });
};
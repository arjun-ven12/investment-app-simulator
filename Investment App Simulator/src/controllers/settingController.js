const settingsModel = require('../models/setting');

//////////////////////////////////////////////////////
// CHANGE EMAIL
//////////////////////////////////////////////////////
module.exports.changeEmail = async (req, res) => {
    try {
        const userId = req.user.id; 
        const { newEmail, password } = req.body;

        if (!newEmail || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const result = await settingsModel.changeEmail(userId, newEmail, password);
        res.status(200).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

//////////////////////////////////////////////////////
// CHANGE PASSWORD
//////////////////////////////////////////////////////
module.exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const result = await settingsModel.changePassword(userId, oldPassword, newPassword);
        res.status(200).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

//////////////////////////////////////////////////////
// CHANGE USERNAME
//////////////////////////////////////////////////////
module.exports.changeUsername = async (req, res) => {
    try {
        const userId = req.user.id;
        const { newUsername, password } = req.body;

        if (!newUsername || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const result = await settingsModel.changeUsername(userId, newUsername, password);
        res.status(200).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

//////////////////////////////////////////////////////
// DELETE ACCOUNT
//////////////////////////////////////////////////////
module.exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }

        const result = await settingsModel.deleteAccount(userId, password);
        res.status(200).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

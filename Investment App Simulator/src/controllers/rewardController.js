const rewardModel = require('../models/reward');

module.exports.getAllRewards = function (req, res) {
    return rewardModel
        .getAllRewards()
        .then(function (rewards) {
            return res.status(200).json(rewards);
        })
        .catch(function (error) {
            console.error('Error in getAllRewards controller:', error.message);
            return res.status(500).json({ error: error.message });
        });
};

module.exports.redeemReward = function (req, res) {
    const { userId, rewardId } = req.body;

    if (!userId || !rewardId) {
        return res.status(400).json({ error: 'User ID and Reward ID are required' });
    }

    return rewardModel
        .redeemReward(userId, rewardId)
        .then(response => res.status(200).json(response))
        .catch(error => {
            console.error('Error in redeemReward controller:', error.message);

            // Ensure the correct error message is sent to the frontend
            if (error.message.includes('not enough money')) {
                return res.status(400).json({ error: "Unable to redeem reward, not enough money in wallet!" });
            }

            return res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
        });
};


module.exports.getRedeemByUserId = function (req, res) {
    const userId = req.params.userId;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    return rewardModel
        .getRedeemByUserId(userId)
        .then(redeemedRewards => res.status(200).json(redeemedRewards))
        .catch(error => {
            console.error('Error in getRedeemByUserId controller:', error.message);

            if (error.message.includes('No redeemed rewards found')) {
                return res.status(404).json({ error: error.message });
            }

            return res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
        });
};

module.exports.spinReward = function (req, res) {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    return rewardModel
        .spinReward(userId)
        .then(response => res.status(200).json(response))
        .catch(error => {
            console.error('Error in spinReward controller:', error.message);
            return res.status(500).json({ error: error.message });
        });
};

module.exports.getGrandPrizeWinners = function (req, res) {
    return rewardModel
        .getGrandPrizeWinners()
        .then(winners => res.status(200).json(winners))
        .catch(error => {
            console.error('Error in getGrandPrizeWinners controller:', error.message);
            return res.status(500).json({ error: error.message });
        });
};
const referralModel = require('../models/referral');


module.exports.getReferralStats = function (req, res) {
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }

    return referralModel
        .getReferralStats(userId)
        .then(function (referralStats) {
            return res.status(200).json(referralStats);
        })
        .catch(function (error) {
            console.error('Error in getReferralStats controller:', error.message);

            if (error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }

            return res.status(500).json({ error: error.message });
        });
};


module.exports.updateReferral = async function (req, res) {
    const userId = parseInt(req.params.userId, 10);
    const referralLink = req.body.referralLink;

    try {
        const updatedReferral = await referralModel.updateReferral(userId, referralLink);
        res.status(200).json({
            message: 'Referral updated successfully',
            referral: updatedReferral,
        });
    } catch (error) {
        console.error(error.message);

        const errorMapping = {
            'Referral link not found': 404,
            'Referral link can only be used within 5 hours of creation': 403,
            'You cannot use your own referral link': 400,
            'Referral link has already been used by this user': 409,
            'This user has reached the maximum limit of successful referrals!': 405,
        };
        

        const statusCode = errorMapping[error.message] || 500;
        res.status(statusCode).json({ error: error.message });
    }
};


module.exports.createReferral = function (req, res) {
    const userId = req.body.userId; // Fixed: Changed user_id to userId to match the request body format
    const referralLink = `https://www.fintech.com/referral/${Math.random().toString(36).substr(2, 9)}`; // Generate random referral link

    return referralModel.createReferral(userId, referralLink)
        .then(function () {
            return res.sendStatus(201);
        })
        .catch(function (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        });
};
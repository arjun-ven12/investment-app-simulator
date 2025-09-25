const referralModel = require('../models/referral');
const { broadcastReferralUpdate } = require('../socketBroadcast'); // ✅ add this
//////////////////////////////////////////////////////
// GET REFERRAL STATS
//////////////////////////////////////////////////////
module.exports.getReferralController = async function (req, res) {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) return res.status(400).json({ success: false, message: 'Invalid user ID' });

  try {
    const stats = await referralModel.getReferralStats(userId);
    return res.status(200).json({ success: true, referral: stats });
  } catch (error) {
    console.error(error);
    if (error.message.includes('not found')) return res.status(404).json({ success: false, message: error.message });
    return res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// CREATE REFERRAL
//////////////////////////////////////////////////////
module.exports.createReferralController = async function (req, res) {
  const userId = req.body.userId;
  try {
    const referral = await referralModel.createReferral(userId);
    return res.status(201).json({ success: true, referral });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// USE REFERRAL LINK
//////////////////////////////////////////////////////
module.exports.useReferralLinkController = async function (req, res) {
  const refereeId = parseInt(req.params.userId, 10);
  const { referralLink } = req.body;

  if (!referralLink) {
    return res.status(400).json({ success: false, message: 'Referral link is required' });
  }

  try {
    const { ownerId, updatedReferral } = await referralModel.useReferralLink(refereeId, referralLink);

    broadcastReferralUpdate(ownerId, {
      referralSignups: updatedReferral.referralSignups,
      successfulReferrals: updatedReferral.successfulReferrals,
      creditsEarned: updatedReferral.creditsEarned,
    });

    return res.status(200).json({
      success: true,
      message: 'Referral used successfully',
      referral: updatedReferral,
    });
  } catch (error) {
    console.error(error);

    const mapping = {
      'Referral link not found': 404,
      'Cannot use your own referral link': 400,
      'Referral link already used by this user': 409,
    };

    const status = mapping[error.message] || 500;
    return res.status(status).json({ success: false, message: error.message });
  }
};


//////////////////////////////////////////////////////
// GET REFERRAL USAGE HISTORY
//////////////////////////////////////////////////////
module.exports.getReferralHistoryController = async function (req, res) {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) return res.status(400).json({ success: false, message: 'Invalid user ID' });

  try {
    const history = await referralModel.getReferralHistory(userId);
    return res.status(200).json({ success: true, history });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


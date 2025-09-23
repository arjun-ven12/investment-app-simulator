const prisma = require('./prismaClient');
const { broadcastReferralUpdate, broadcastReferralHistoryUpdate } = require('../socketBroadcast'); // ✅ add this
//////////////////////////////////////////////////////
// HELPER FUNCTIONS
//////////////////////////////////////////////////////

// Calculate current earned credits based on successful referrals
function calculateCredits(successfulReferrals) {
  const base = 1000;      // first referral
  const increment = 500;  // each additional
  const max = 5000;       // set max cap, adjust as needed
  if (successfulReferrals === 0) return 0;
  return Math.min(base + (successfulReferrals - 1) * increment, max);
}

// Calculate next tier credits (what user will get for next referral)
function calculateNextTierCredits(successfulReferrals) {
  const base = 1000;
  const increment = 500;
  const max = 5000;
  return Math.min(base + successfulReferrals * increment, max);
}

//////////////////////////////////////////////////////
// GET REFERRAL STATS
//////////////////////////////////////////////////////
module.exports.getReferralStats = async function getReferralStats(userId) {
  const referral = await prisma.referral.findFirst({ where: { userId } });
  if (!referral) throw new Error('Referral data not found');

  const creditsEarned = calculateCredits(referral.successfulReferrals);
  const nextTierCredits = calculateNextTierCredits(referral.successfulReferrals);

  return {
    referralSignups: referral.referralSignups,
    successfulReferrals: referral.successfulReferrals,
    rewardsExchanged: referral.rewardsExchanged,
    creditsEarned,      // dynamically calculated
    referralLink: referral.referralLink,
    currentTier: referral.tier,
    nextTierCredits,
  };
};

//////////////////////////////////////////////////////
// CREATE REFERRAL
//////////////////////////////////////////////////////
module.exports.createReferral = async function createReferral(userId) {
  if (!userId || isNaN(userId)) throw new Error('Invalid user ID');

  const referralLink = `https://www.fintech.com/referral/${Math.random().toString(36).substr(2, 9)}`;

  const referral = await prisma.referral.create({
    data: {
      userId,
      referralLink,
      referralSignups: 0,
      successfulReferrals: 0,
      rewardsExchanged: 0,
      creditsEarned: 0,
      wallet: 100000,
      tier: 1,
    },
  });

  return referral;
};

//////////////////////////////////////////////////////
// USE REFERRAL LINK
//////////////////////////////////////////////////////
module.exports.useReferralLink = async function useReferralLink(userId, referralLink) {
  if (!userId || isNaN(userId)) throw new Error('Invalid user ID');

  const referral = await prisma.referral.findUnique({ where: { referralLink } });
  if (!referral) throw new Error('Referral link not found');
  if (referral.userId === userId) throw new Error('Cannot use your own referral link');

  const alreadyUsed = await prisma.referralUsage.findFirst({
    where: { userId, referralId: referral.id },
  });
  if (alreadyUsed) throw new Error('Referral link already used by this user');

  // Increment stats
  const newSuccessfulReferrals = referral.successfulReferrals + 1;
  const newCredits = calculateCredits(newSuccessfulReferrals);

  const [updatedReferral] = await prisma.$transaction([
    prisma.referral.update({
      where: { id: referral.id },
      data: {
        referralSignups: { increment: 1 },
        successfulReferrals: { increment: 1 },
        creditsEarned: newCredits,
        tier: { increment: 1 }, // optional
      },
    }),
    prisma.referralUsage.create({
      data: { userId, referralId: referral.id, status: 'SUCCESSFUL' },
    }),
    prisma.user.update({
      where: { id: referral.userId },
      data: { wallet: { increment: newCredits } },
    }),
  ]);

  // Broadcast referral update to referral owner
  broadcastReferralUpdate(referral.userId, {
    referralSignups: updatedReferral.referralSignups,
    successfulReferrals: updatedReferral.successfulReferrals,
    creditsEarned: updatedReferral.creditsEarned,
  });
const updatedHistory = await module.exports.getReferralHistory(referral.userId);
broadcastReferralHistoryUpdate(referral.userId, updatedHistory);

  return { ownerId: referral.userId, updatedReferral };
};



//////////////////////////////////////////////////////
// GET REFERRAL HISTORY
//////////////////////////////////////////////////////
module.exports.getReferralHistory = async function (userId) {
  const history = await prisma.referralUsage.findMany({
    where: { 
      OR: [
        { userId },               // usage by this user
        { referral: { userId } }  // usage of this user's referral
      ]
    },
    include: {
      user: { select: { username: true } }, // who used the referral
      referral: {
        include: {
          user: { select: { username: true } } // owner of referral
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return history.map(item => {
    const usedByName = item.user?.username ?? 'Unknown';
    const ownerName = item.referral?.user?.username ?? 'Unknown';

    let actionText = '';
    if (item.userId === userId) {
      actionText = `You used ${ownerName}'s referral`;
    } else if (item.referral?.userId === userId) {
      actionText = `${usedByName} used your referral`;
    } else {
      actionText = `${usedByName} used ${ownerName}'s referral`;
    }

    return {
      id: item.id,
      action: actionText,
      usedBy: usedByName,
      referralOwner: ownerName,
      usedAt: item.createdAt,
      referralLink: item.referral?.referralLink ?? 'N/A'
    };
  });
};


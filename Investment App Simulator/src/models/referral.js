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
// USE REFERRAL LINK (NORMALIZED + VERIFICATION SAFE)
//////////////////////////////////////////////////////
module.exports.useReferralLink = async function useReferralLink(userId, input) {
  if (!userId || isNaN(userId)) {
    throw new Error("Invalid user ID");
  }
  if (!input) {
    throw new Error("Referral code missing");
  }

  // -------------------------------------------------
  // 1️⃣ NORMALIZE INPUT → extract the actual code
  // -------------------------------------------------
  let referralCode = input.trim();

  // Full URL → extract last segment
  try {
    if (referralCode.startsWith("http")) {
      const url = new URL(referralCode);
      referralCode = url.pathname.split("/").pop();
    }
  } catch {
    // ignore malformed URLs
  }

  // /r/xyz → xyz
  if (referralCode.includes("/")) {
    referralCode = referralCode.split("/").pop();
  }

  if (!referralCode) {
    throw new Error("Invalid referral code");
  }

  // -------------------------------------------------
  // 2️⃣ FIND REFERRAL BY *CODE*, NOT FULL URL
  // -------------------------------------------------
  const referral = await prisma.referral.findFirst({
    where: {
      referralLink: {
        endsWith: referralCode, // ✅ THIS is the key
      },
    },
  });

  if (!referral) {
    throw new Error("Referral code not found");
  }

  // -------------------------------------------------
  // 3️⃣ PREVENT ABUSE
  // -------------------------------------------------
  if (referral.userId === userId) {
    throw new Error("Cannot use your own referral code");
  }

  const alreadyUsed = await prisma.referralUsage.findFirst({
    where: {
      userId,
      referralId: referral.id,
    },
  });

  if (alreadyUsed) {
    throw new Error("Referral already used by this user");
  }

  // -------------------------------------------------
  // 4️⃣ CREATE *PENDING* REFERRAL (credits later)
  // -------------------------------------------------
  await prisma.referralUsage.create({
    data: {
      userId,
      referralId: referral.id,
      status: "PENDING",
    },
  });

  return {
    message: "Referral recorded. Reward will be released after verification.",
  };
};



//////////////////////////////////////////////////////
// GET REFERRAL HISTORY
//////////////////////////////////////////////////////
module.exports.getReferralHistory = async function (userId) {
  const history = await prisma.referralUsage.findMany({
    where: { 
      OR: [
        { userId },               // user used a referral
        { referral: { userId } }  // user owns the referral that others used
      ]
    },
    include: {
      user: { select: { username: true } }, 
      referral: {
        include: {
          user: { select: { username: true, id: true } } 
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return history.map(item => {
    const usedByName = item.user?.username ?? 'Unknown';
    const ownerName = item.referral?.user?.username ?? 'Unknown';
    const ownerId = item.referral?.user?.id; // 🔥 Needed to check who owns referral

    let actionText = "";
    let creditsToShow = null; // 🔥 hide credits for non-owner by default

    if (item.referral?.userId === userId) {
      // YOU are the referral owner
      actionText = `${usedByName} used your referral`;
      creditsToShow = item.creditsEarned ?? 0; // show credits ONLY to owner
    } 
    else if (item.userId === userId) {
      // YOU used someone's referral
      actionText = `You used ${ownerName}'s referral`;
      creditsToShow = null; // 🔒 hide owner credits
    } 
    else {
      // fallback (should rarely happen)
      actionText = `${usedByName} used ${ownerName}'s referral`;
    }

    return {
      id: item.id,
      action: actionText,
      usedBy: usedByName,
      referralOwner: ownerName,
      usedAt: item.createdAt,
      credits: creditsToShow,    // 👈 NEW — safe credit visibility
      referralLink: item.referral?.referralLink ?? 'N/A'
    };
  });
};


//////////////////////////////////////////////////////
// FINALIZE REFERRAL (VERIFY + DEPOSIT CREDITS)
//////////////////////////////////////////////////////
module.exports.finalizeReferral = async function finalizeReferral(userId) {
  // 1️⃣ Find pending referral usage
  const usage = await prisma.referralUsage.findFirst({
    where: {
      userId,
      status: "PENDING",
    },
    include: {
      referral: true,
    },
  });

  if (!usage) return; // no referral to verify

  // 2️⃣ Prevent double verification
  const alreadyVerified = await prisma.referralUsage.findFirst({
    where: {
      userId,
      status: "SUCCESSFUL",
    },
  });
  if (alreadyVerified) return;

  // 3️⃣ Increment successful referrals
  const updatedReferral = await prisma.referral.update({
    where: { id: usage.referralId },
    data: {
      successfulReferrals: { increment: 1 },
    },
  });

  // 4️⃣ Calculate credits
  const creditsEarned = calculateCredits(
    updatedReferral.successfulReferrals
  );

  // 5️⃣ Mark usage as VERIFIED
  await prisma.referralUsage.update({
    where: { id: usage.id },
    data: {
      status: "SUCCESSFUL",
      creditsEarned,
    },
  });

  await prisma.referral.update({
  where: { id: usage.referralId },
  data: {
    wallet: { increment: creditsEarned },
  },
});


  // 7️⃣ Live socket updates
  broadcastReferralUpdate(updatedReferral.userId);
  broadcastReferralHistoryUpdate(updatedReferral.userId);
};
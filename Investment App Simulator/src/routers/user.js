const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const prisma = require("../../prisma/prismaClient");
const jwtMiddleware = require('../middlewares/jwtMiddleware');
router.post('/register', userController.register);
router.post('/login', userController.login);
const { broadcastReferralUpdate, broadcastReferralHistoryUpdate } = require('../socketBroadcast'); // ✅ add this
router.get('/get/:userId', jwtMiddleware.verifyToken, userController.getUserDetails);
router.post("/forgot-password", userController.forgotPassword);
router.post("/verify-reset-code", userController.verifyResetCode);
router.post("/reset-password", userController.resetPassword);
router.post("/verify-reset-code", userController.verifyResetCode);
router.post("/resend-verification", userController.resendVerification);
router.post("/get-email", async (req, res) => {
  const { username } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(404).json({ message: "No account found" });
  res.json({ email: user.email });
});
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
async function getReferralHistory(userId) {
  const history = await prisma.referralUsage.findMany({
    where: {
      OR: [
        { userId },               // the user used a referral
        { referral: { userId } }  // the user owns the referral
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
    orderBy: { createdAt: "desc" }
  });

  return history.map(item => {
    const usedByName = item.user?.username ?? "Unknown";
    const ownerName = item.referral?.user?.username ?? "Unknown";
    const ownerId = item.referral?.user?.id;

    let actionText = "";
    let credits = null; // 🔒 hide by default

    if (item.referral?.userId === userId) {
      // YOU own this referral → show credits
      actionText = `${usedByName} used your referral`;
      credits = item.creditsEarned ?? 0;
    } else if (item.userId === userId) {
      // YOU used someone's referral → hide credits
      actionText = `You used ${ownerName}'s referral`;
      credits = null;
    } else {
      actionText = `${usedByName} used ${ownerName}'s referral`;
      credits = null;
    }

    return {
      id: item.id,
      action: actionText,
      usedBy: usedByName,
      referralOwner: ownerName,
      usedAt: item.createdAt,
      credits,
      referralLink: item.referral?.referralLink ?? "N/A"
    };
  });
}


router.get("/verify/:token", async (req, res) => {
  const { token } = req.params;
  if (!token) return res.status(400).send("Missing token.");

  try {
    // 1️⃣ Find user with valid token + not expired
    const user = await prisma.user.findFirst({
      where: {
        verifyToken: token,
        verifyExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.redirect("/verify-failed");
    }

    // 2️⃣ Mark account as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verified: true,
        verifyToken: null,
        verifyExpires: null,
      },
    });

    // ----------------------------------------------------
    // 3️⃣ RELEASE REFERRAL REWARD NOW THAT USER IS VERIFIED
    // ----------------------------------------------------

    // Find all pending referrals involving this user
    const pendingReferrals = await prisma.referralUsage.findMany({
      where: {
        userId: user.id,
        status: "PENDING"
      },
      include: { referral: true },
    });

    for (const entry of pendingReferrals) {
      const ref = entry.referral;
      if (!ref || !ref.userId) continue; // safety check

      // Calculate credits based on your tier system
      const newSuccessfulCount = ref.successfulReferrals + 1;
      const newCredits = calculateCredits(newSuccessfulCount);

      // Apply updates atomically
      const [updatedReferral] = await prisma.$transaction([
        prisma.referral.update({
          where: { id: ref.id },
          data: {
            referralSignups: { increment: 1 },
            successfulReferrals: { increment: 1 },
            creditsEarned: newCredits,
          },
        }),
        prisma.user.update({
          where: { id: ref.userId },
          data: {
            wallet: { increment: newCredits },
          },
        }),
        prisma.referralUsage.update({
          where: { id: entry.id },
          data: {
            status: "SUCCESSFUL",
            creditsEarned: newCredits,
          },
        }),
      ]);

      // 🔔 Notify referrer via WebSocket
      broadcastReferralUpdate(ref.userId, {
        referralSignups: updatedReferral.referralSignups,
        successfulReferrals: updatedReferral.successfulReferrals,
        creditsEarned: updatedReferral.creditsEarned,
      });

      const updatedHistory = await getReferralHistory(ref.userId);
      broadcastReferralHistoryUpdate(ref.userId, updatedHistory);

    }

    // ----------------------------------------------------
    // 4️⃣ Redirect to successful page
    // ----------------------------------------------------
    return res.redirect("/email-verified");

  } catch (err) {
    console.error("Verification error:", err);
    return res.redirect("/verify-failed");
  }
});



module.exports = router;

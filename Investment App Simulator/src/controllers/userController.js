const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../prisma/prismaClient");
const referralModel = require("../models/referral");
const JWT_SECRET = process.env.JWT_SECRET_KEY;
const userModel = require("../models/user");
const crypto = require("crypto");
const { sendVerificationEmail, sendPasswordResetCode } = require("../utils/email");


// ---------------------------------------------------------
// EMAIL VALIDATION (Option A - safest, production-friendly)
// ---------------------------------------------------------
function isRealEmail(email) {
  // Strong format validation (same used by Stripe)
  const regex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  if (!regex.test(email)) return false;

  // All REAL validation is done via clicking the verification link
  return true;
}



// ---------------------------------------------------------
// REGISTER USER
// ---------------------------------------------------------
module.exports.register = async (req, res) => {
  const { email, username, password, name, referralCode } = req.body;

  try {
    // 1️⃣ Basic format validation (safe for Render + Gmail)
    if (!isRealEmail(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    // 2️⃣ Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email or username already exists.",
      });
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Generate verification token
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyExpires = new Date(Date.now() + 60 * 60 * 1000);

    // 5️⃣ Create unverified user
    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name,
        verified: false,
        verifyToken,
        verifyExpires,
        onboardingStage: "home",
        skipOnboarding: false,
        termsAccepted: req.body.termsAccepted === true,
        termsAcceptedAt: req.body.termsAccepted ? new Date() : null,
      },
    });

    // 6️⃣ Send verification email
    await sendVerificationEmail(email, verifyToken);

    // 7️⃣ Create referral tracking row
    const referralCodeUse = crypto.randomBytes(5).toString("hex");
    const userReferralLink = `https://theblacksealed.com/r/${username}-${referralCodeUse}`;

    await prisma.referral.create({
      data: {
        userId: newUser.id,
        referralLink: userReferralLink,
        referralSignups: 0,
        successfulReferrals: 0,
        rewardsExchanged: 0,
        creditsEarned: 0,
        tier: 1,
        wallet: 100000,
      },
    });

    // 8️⃣ Handle referral usage (if any)
    if (referralCode) {
      try {
        await referralModel.useReferralLink(newUser.id, referralCode);
      } catch (err) {
        console.warn("Referral code error:", err.message);
      }
    }

    // 9️⃣ Return success
    return res.status(201).json({
      message: "Verification email sent. Please check your inbox.",
    });

  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};




// ---------------------------------------------------------
// LOGIN USER
// ---------------------------------------------------------
const MAX_ATTEMPTS = 3;
const LOCK_WINDOW_MIN = 5;

module.exports.login = async (req, res) => {
  const { email, username, password } = req.body;

  try {
    // 1) Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          username ? { username } : {},
        ],
      },
    });

    if (!user) return res.status(401).json({ message: "Invalid credentials." });

    // 2) Check lockout
    if (user.lockUntil && new Date() < user.lockUntil) {
      return res.status(403).json({
        message: "Account temporarily locked.",
        lockUntil: user.lockUntil,
      });
    }

    // 3) SSO-only accounts
    if ((user.googleId || user.microsoftId) && !user.password) {
      return res.status(403).json({
        message: `Please sign in using ${user.googleId ? "Google" : "Microsoft"}.`,
      });
    }

    // 4) Require email verification
    if (!user.verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
      });
    }

    // 5) Password check
    const isMatch = await bcrypt.compare(password || "", user.password || "");

    if (!isMatch) {
      const nextFailed = (user.failedLogins || 0) + 1;

      if (nextFailed >= MAX_ATTEMPTS) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLogins: 0,
            lockUntil: new Date(Date.now() + LOCK_WINDOW_MIN * 60 * 1000),
          },
        });

        return res.status(401).json({
          message: `Too many failed attempts. Account locked for ${LOCK_WINDOW_MIN} minutes.`,
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins: nextFailed,
          lockUntil: null,
        },
      });

      return res.status(401).json({
        message: `Invalid credentials. ${MAX_ATTEMPTS - nextFailed} attempts left.`,
      });
    }

    // 6) Reset failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: 0,
        lockUntil: null,
      },
    });

    // 7) Issue JWT
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.status(200).json({
      message: "Login successful.",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        onboardingStage: user.onboardingStage,
        skipOnboarding: user.skipOnboarding,
      },
      token,
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};




// ---------------------------------------------------------
// GET USER DETAILS
// ---------------------------------------------------------
module.exports.getUserDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await userModel.getUserBasicInfo(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    return res.status(200).json({ user });

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};




// ---------------------------------------------------------
// FORGOT PASSWORD
// ---------------------------------------------------------
module.exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: "No account found with that email." });
    }

    if (!user.verified) {
      return res.status(403).json({
        message: "Please verify your account before resetting your password.",
        canResend: true,
      });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { resetCode, resetExpires },
    });

    await sendPasswordResetCode(email, resetCode);

    return res.json({ message: "Reset code sent to your email." });

  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};




// ---------------------------------------------------------
// VERIFY RESET CODE
// ---------------------------------------------------------
module.exports.verifyResetCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: "Invalid email." });

    if (user.resetCode !== code) {
      return res.status(400).json({ message: "Invalid or expired code." });
    }

    if (new Date() > user.resetExpires) {
      return res.status(400).json({ message: "Code has expired." });
    }

    return res.json({ message: "Code verified successfully." });

  } catch (err) {
    console.error("Verify reset code error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};




// ---------------------------------------------------------
// RESET PASSWORD
// ---------------------------------------------------------
module.exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ message: "Invalid email." });

    if (user.resetCode !== code)
      return res.status(400).json({ message: "Invalid or expired code." });

    if (new Date() > user.resetExpires)
      return res.status(400).json({ message: "Code expired." });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetExpires: null,
      },
    });

    return res.json({ message: "Password reset successful." });

  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};




// ---------------------------------------------------------
// RESEND VERIFICATION EMAIL
// ---------------------------------------------------------
module.exports.resendVerification = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await userModel.findUserByEmail(email);

    if (!user) {
      return res.status(400).json({ message: "No account found." });
    }

    if (user.verified) {
      return res.status(400).json({ message: "Account already verified." });
    }

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyExpires = new Date(Date.now() + 60 * 60 * 1000);

    await userModel.resendVerificationEmail(email, verifyToken, verifyExpires);

    await sendVerificationEmail(email, verifyToken);

    return res.status(200).json({
      message: "Verification email resent successfully.",
    });

  } catch (err) {
    console.error("Resend verification error:", err);
    return res.status(500).json({ message: "Server error." });
  }
};

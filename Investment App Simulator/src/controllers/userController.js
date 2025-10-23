const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../prisma/prismaClient"); // your Prisma client
const referralModel = require("../models/referral");
const JWT_SECRET = process.env.JWT_SECRET_KEY;
const userModel = require("../models/user");
const crypto = require("crypto");
const { sendVerificationEmail, sendPasswordResetCode } = require("../utils/email");




const dns = require("dns");
const emailExistence = require("email-existence");

// simple domain + SMTP validation
async function isRealEmail(email) {
  // basic regex
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) return false;

  // check MX records
  const domain = email.split("@")[1];
  const mxExists = await new Promise((resolve) => {
    dns.resolveMx(domain, (err, addresses) => {
      if (err || !addresses?.length) resolve(false);
      else resolve(true);
    });
  });
  if (!mxExists) return false;

  // optional SMTP probe (can be slow)
  const exists = await new Promise((resolve) => {
    emailExistence.check(email, (err, res) => {
      if (err) resolve(false);
      else resolve(res);
    });
  });

  return exists;
}
//////////////////////////////////////////////////////
// REGISTER USER
//////////////////////////////////////////////////////
module.exports.register = async (req, res) => {
  const { email, username, password, name, referralCode } = req.body;

  try {
    // 1️⃣ Validate email format before continuing
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address." });
    }

    // ✅ new check: verify if email actually exists
    const isValid = await isRealEmail(email);
    if (!isValid) {
      return res.status(400).json({
        message: "This email address appears invalid or unreachable. Please use a real email.",
      });
    }
    // 2️⃣ Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existingUser) {
      return res.status(400).json({ message: "Email or username already exists." });
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Generate verification token and expiry
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // 5️⃣ Create user (unverified)
    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name,
        verified: false,
        verifyToken,
        verifyExpires,
      },
    });

    // 6️⃣ Send verification email
    await sendVerificationEmail(email, verifyToken);

    // 7️⃣ Create referral info (optional)
    const referralCodeUse = crypto.randomBytes(5).toString("hex");
    const userReferralLink = `https://www.sealed-fi.com/referral/${username}-${referralCodeUse}`;

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

    // 8️⃣ Handle referral usage
    if (referralCode) {
      try {
        await referralModel.useReferralLink(newUser.id, referralCode);
      } catch (err) {
        console.warn("Referral code error:", err.message);
      }
    }

    // ✅ 9️⃣ Do NOT log user in yet — just return success message
    return res.status(201).json({
      message: "Verification email sent. Please check your inbox to verify your account.",
    });

  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

//////////////////////////////////////////////////////
// LOGIN USER
//////////////////////////////////////////////////////
module.exports.login = async (req, res) => {
  const { email, username, password } = req.body;
  // const link = `${process.env.APP_URL}/verify/${token}`;
  try {
    // 1️⃣ Find user by email OR username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          username ? { username } : {}
        ],
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // 🚫 Block password login for Google-only users
    if (user.googleId && !user.password) {
      return res.status(403).json({
        message: "Please sign in using Google — this account doesn’t have a password.",
      });
    }
    // 2️⃣ Check if verified
    if (!user.verified) {
      return res
        .status(403)
        .json({ message: "Please verify your email before logging in." });
    }

    // 3️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // 4️⃣ Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // 5️⃣ Return success
    return res.status(200).json({
      message: "Login successful.",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

//////////////////////////////////////////////////////
// GET SPECIFIC USER DETAILS
//////////////////////////////////////////////////////

module.exports.getUserDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userModel.getUserBasicInfo(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ user }); // { username, wallet }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "No account found with that email." });
    }

    // 🚫 not verified yet
    if (!user.verified) {
      return res.status(403).json({
        message: "Please verify your account before resetting your password.",
        canResend: true, // so frontend knows to show 'Resend verification email'
      });
    }

    // ✅ verified — generate code and email
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { email },
      data: { resetCode, resetExpires },
    });

    await sendPasswordResetCode(email, resetCode);
    return res.json({ message: "Reset code sent to your email." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error." });
  }
};


// ✅ Verify Reset Code (keeps code valid until reset)
module.exports.verifyResetCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Invalid email." });
    }

    if (user.resetCode !== code) {
      return res.status(400).json({ message: "Invalid or expired code." });
    }

    if (new Date() > user.resetExpires) {
      return res.status(400).json({ message: "Code has expired." });
    }

    // ✅ Do NOT clear code here — wait until password is reset
    res.json({
      message: "Code verified successfully.",
    });
  } catch (err) {
    console.error("Verify reset code error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

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
        resetCode: null,       // ✅ clear only now
        resetExpires: null,
      },
    });

    res.json({ message: "Password reset successful." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error." });
  }
};



module.exports.resendVerification = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await userModel.findUserByEmail(email);

    if (!user) {
      return res.status(400).json({ message: "No account found." });
    }

    if (user.verified) {
      return res.status(400).json({ message: "Account is already verified." });
    }

    // create new verification token + expiry
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // update in DB
    await userModel.resendVerificationEmail(email, verifyToken, verifyExpires);

    // send verification email
    await sendVerificationEmail(email, verifyToken);

    return res.status(200).json({
      message: "Verification email resent successfully.",
    });
  } catch (err) {
    console.error("Resend verification error:", err);
    res.status(500).json({ message: "Server error." });
  }
};

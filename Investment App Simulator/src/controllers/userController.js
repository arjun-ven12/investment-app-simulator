const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../prisma/prismaClient"); // your Prisma client
const referralModel = require("../models/referral");
const JWT_SECRET = process.env.JWT_SECRET_KEY;
const userModel = require("../models/user");
const crypto = require("crypto");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/email");
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
    const userId = req.params.userId;
    const user = await userModel.getUserBasicInfo(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ user }); // { username, wallet }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


//////////////////////////////////////////////////////
// FORGOT PASSWORD
//////////////////////////////////////////////////////
module.exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // 1️⃣ Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "No account found with this email." });
    }

    // 2️⃣ Generate reset token and expiry (1 hour)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    // 3️⃣ Save token to user
    await prisma.user.update({
      where: { email },
      data: { verifyToken: resetToken, verifyExpires: resetExpires },
    });

    // 4️⃣ Send reset email
    await sendPasswordResetEmail(email, resetToken);

    return res.status(200).json({
      message: "Password reset email sent. Please check your inbox.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

//////////////////////////////////////////////////////
// RESET PASSWORD
//////////////////////////////////////////////////////
module.exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // 1️⃣ Find user by valid token
    const user = await prisma.user.findFirst({
      where: { verifyToken: token, verifyExpires: { gt: new Date() } },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset link." });
    }

    // 2️⃣ Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3️⃣ Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        verifyToken: null,
        verifyExpires: null,
      },
    });

    res.status(200).json({ message: "Password has been reset successfully!" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
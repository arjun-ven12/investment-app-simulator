const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../prisma/prismaClient"); // your Prisma client
const referralModel = require("../models/referral");
const JWT_SECRET = process.env.JWT_SECRET_KEY;
const userModel = require("../models/user");
//////////////////////////////////////////////////////
// REGISTER USER
//////////////////////////////////////////////////////
module.exports.register = async (req, res) => {
  const { email, username, password, name, referralCode } = req.body;

  try {
    // 1️⃣ Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email or username already exists" });
    }

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Create user
    const newUser = await prisma.user.create({
      data: { email, username, password: hashedPassword, name },
    });

    // 4️⃣ Create referral for this user
    const userReferralLink = `https://www.fintech.com/referral/${Math.random()
      .toString(36)
      .substr(2, 9)}`;
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

    // 5️⃣ If referral code is provided, use existing referral logic
    if (referralCode) {
      try {
        // Reuse your referral model's useReferralLink function
        await referralModel.useReferralLink(newUser.id, referralCode);
      } catch (err) {
        console.error("Referral code error:", err.message);
        // optional: ignore error or notify user, don't block registration
      }
    }

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.status(201).json({
      message: "User registered successfully",
      user: { id: newUser.id, email, username, referralLink: userReferralLink },
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//////////////////////////////////////////////////////
// LOGIN USER
//////////////////////////////////////////////////////
module.exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1️⃣ Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // 2️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.status(200).json({
      message: "Login successful",
      user: { id: user.id, email: user.email, username: user.username },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
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

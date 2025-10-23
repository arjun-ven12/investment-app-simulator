const prisma = require('../models/prismaClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const referralModel = require('../models/referral');
const { broadcastReferralUpdate } = require('../socketBroadcast');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const SALT_ROUNDS = 10;

//////////////////////////////////////////////////////
// REGISTER USER (with optional referral)
//////////////////////////////////////////////////////
module.exports.register = async function (req, res) {
  const { email, password, username, name, referralLink } = req.body;

  try {
    // 1️⃣ Check if email/username exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email or username already in use' });
    }

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 3️⃣ Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        name,
        wallet: 100000, // default wallet
      },
    });

    // 4️⃣ Create user's own referral record
    await referralModel.createReferral(newUser.id);

    // 5️⃣ If referral code was provided, use it
    if (referralLink) {
      try {
        await referralModel.useReferralLink(newUser.id, referralLink);
      } catch (err) {
        console.warn('Referral link not applied:', err.message);
        // We don’t block registration for invalid referral codes
      }
    }

    return res.status(201).json({
      success: true,
      message: "Verification email sent! Please verify your email before logging in.",
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

//////////////////////////////////////////////////////
// LOGIN USER
//////////////////////////////////////////////////////
module.exports.login = async function (req, res) {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    if (!user.verified) {
      return res.status(403).json({ success: false, message: "Please verify your email before logging in." });
    }
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


//////////////////////////////////////////////////////
// GET SPECIFIC USER BASIC INFO
//////////////////////////////////////////////////////
module.exports.getUserBasicInfo = async (userId) => {
  return await prisma.user.findUnique({
    where: { id: parseInt(userId) },
    select: {
      username: true,
      wallet: true,
    },
  });
};


module.exports.resendVerificationEmail = async (email, verifyToken, verifyExpires) => {
  return await prisma.user.update({
    where: { email },
    data: { verifyToken, verifyExpires },
  });
};

module.exports.findUserByEmail = async (email) => {
  return await prisma.user.findUnique({ where: { email } });
};

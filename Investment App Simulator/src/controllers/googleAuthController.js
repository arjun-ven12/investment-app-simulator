const { OAuth2Client } = require("google-auth-library");
const prisma = require("../../prisma/prismaClient");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// ✅ STEP 1: Redirect user to Google
exports.googleLogin = (req, res) => {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const scope = "openid email profile";
  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    `client_id=${process.env.GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    "&response_type=code" +
    `&scope=${encodeURIComponent(scope)}`;
  res.redirect(authUrl);
};

// ✅ STEP 2: Handle callback
exports.googleCallback = async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).json({ message: "Missing code" });

    // Exchange code for tokens
    const { tokens } = await client.getToken({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    });

    // Verify ID token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    // 🔍 Check if user already exists
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // ✅ CASE 1: Manual signup user now logging in with Google
      if (!user.googleId && user.password) {
        user = await prisma.user.update({
          where: { email },
          data: { googleId, verified: true },
        });
      }
      // ✅ CASE 2: Google user already exists, just continue
    } else {
      // ✅ CASE 3: Completely new Google user — create new record

      // Ensure unique username
      let baseUsername = email.split("@")[0];
      let username = baseUsername;
      let count = 1;
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${count++}`;
      }

      // Create user
      user = await prisma.user.create({
        data: {
          email,
          username,
          name,
          verified: true,
          password: null,
          googleId,
        },
      });

      // Create referral record (like manual signup)
      const referralCodeUse = crypto.randomBytes(5).toString("hex");
      const userReferralLink = `https://www.sealed-fi.com/referral/${username}-${referralCodeUse}`;
      await prisma.referral.create({
        data: {
          userId: user.id,
          referralLink: userReferralLink,
          referralSignups: 0,
          successfulReferrals: 0,
          rewardsExchanged: 0,
          creditsEarned: 0,
          tier: 1,
          wallet: 100000,
        },
      });
    }

    // 🧠 Step 3: Generate JWT for frontend
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    // Redirect to frontend
    res.redirect(
      `${process.env.APP_URL}/html/google-callback.html?token=${token}`
    );
  } catch (error) {
    console.error("❌ Google login error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
};

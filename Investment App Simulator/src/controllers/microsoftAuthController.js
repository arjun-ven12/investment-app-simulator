const axios = require("axios");
const jwt = require("jsonwebtoken");
const prisma = require("../../prisma/prismaClient");
const crypto = require("crypto");

exports.microsoftLogin = (req, res) => {
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
  const scope = "openid profile email User.Read";

  const authUrl =
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" +
    `client_id=${process.env.MICROSOFT_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_mode=query` +
    `&scope=${encodeURIComponent(scope)}`;

  res.redirect(authUrl);
};


exports.microsoftCallback = async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing code");

  try {
    // 1️⃣ Exchange code for access + id tokens
    const tokenResponse = await axios.post(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, id_token } = tokenResponse.data;

    // 2️⃣ Decode ID token to extract user info
    const payload = JSON.parse(
      Buffer.from(id_token.split(".")[1], "base64").toString()
    );

    const microsoftId = payload.sub; // ✅ define this before use
    const email = payload.email || payload.preferred_username;
    const displayName = payload.name || email.split("@")[0];

    // 3️⃣ Check if user exists
    let user = await prisma.user.findUnique({ where: { email } });

    // 4️⃣ Create new user if not found
    if (!user) {
      let baseUsername = email.split("@")[0];
      let username = baseUsername;
      let count = 1;

      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${count++}`;
      }

      user = await prisma.user.create({
        data: {
          email,
          username,
          name: displayName,
          verified: true,
          password: "",
          microsoftId, // ✅ now defined correctly
        },
      });

      // 5️⃣ Auto-create referral record
      const referralCodeUse = crypto.randomBytes(5).toString("hex");
      const userReferralLink = `https://theblacksealed.com/r/${username}-${referralCodeUse}`;

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

    // 6️⃣ Generate JWT for frontend
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    // 7️⃣ Redirect back to frontend with token
    res.redirect(`${process.env.APP_URL}/html/microsoft-callback.html?token=${token}`);
  } catch (err) {
    console.error("Microsoft login error:", err.response?.data || err.message);
    res.status(500).send("Authentication failed");
  }
};

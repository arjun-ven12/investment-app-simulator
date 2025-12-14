// ============================================================
// GOOGLE AUTH CONTROLLER — BLACKSEALED
// ============================================================

const { OAuth2Client } = require("google-auth-library");
const prisma = require("../../prisma/prismaClient");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const APP_URL = process.env.APP_URL;
const JWT_SECRET = process.env.JWT_SECRET_KEY;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const client = new OAuth2Client({
  clientId: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  redirectUri: GOOGLE_REDIRECT_URI,
});

// ============================================================
// Helper — Issue JWT
// ============================================================
function issueJwt(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// ============================================================
// STEP 1 — Redirect user to Google (capture referral)
// ============================================================
exports.googleLogin = (req, res) => {
  const scope = "openid email profile";
  const referral = req.query.ref;

  if (referral) {
    res.cookie("oauth_ref", referral, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 10 * 60 * 1000, // 10 minutes
    });
  }

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    `client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}` +
    "&response_type=code" +
    `&scope=${encodeURIComponent(scope)}`;

  res.redirect(authUrl);
};

// ============================================================
// STEP 2 — Handle Google callback
// ============================================================
exports.googleCallback = async (req, res) => {
  const referralCode = req.cookies?.oauth_ref || null;

  try {
    const code = req.query.code;
    if (!code) return res.status(400).json({ message: "Missing code" });

    // Clear referral cookie immediately (one-time use)
    res.clearCookie("oauth_ref");

    // 1) Exchange code for tokens
    const { tokens } = await client.getToken({
      code,
      redirect_uri: GOOGLE_REDIRECT_URI,
    });

    // 2) Verify ID token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    // 3) Check for existing user
    let user = await prisma.user.findUnique({ where: { email } });

    // ============================================================
    // CASE A — EXISTING USER (NO REFERRAL APPLIED)
    // ============================================================
    if (user) {
      if (!user.googleId && user.password) {
        user = await prisma.user.update({
          where: { email },
          data: { googleId, verified: true },
        });
      }

      const token = issueJwt(user);

      if (!user.termsAccepted) {
        return res.redirect(
          `${APP_URL}/html/google-terms.html?email=${encodeURIComponent(
            email
          )}&token=${encodeURIComponent(token)}`
        );
      }

      return res.redirect(
        `${APP_URL}/html/google-callback.html?token=${encodeURIComponent(
          token
        )}`
      );
    }

    // ============================================================
    // CASE B — BRAND NEW USER (REFERRAL ELIGIBLE)
    // ============================================================

    // Ensure unique username
    let base = email.split("@")[0];
    let username = base;
    let count = 1;

    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${base}${count++}`;
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        name,
        verified: true,
        googleId,
        password: null,
        termsAccepted: false,
      },
    });

    // ------------------------------------------------------------
    // Apply referral ONLY if:
    // - referral exists
    // - referrer exists
    // - not self-referral
    // ------------------------------------------------------------
    if (referralCode) {
      const referrer = await prisma.referral.findFirst({
        where: {
          referralLink: { contains: referralCode },
        },
        include: { user: true },
      });

      if (referrer && referrer.user.email !== email) {
        await prisma.referral.update({
          where: { id: referrer.id },
          data: {
            referralSignups: { increment: 1 },
          },
        });
      }
    }

    // Create referral profile for new user
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

    const token = issueJwt(newUser);

    return res.redirect(
      `${APP_URL}/html/google-terms.html?email=${encodeURIComponent(
        email
      )}&token=${encodeURIComponent(token)}`
    );
  } catch (err) {
    console.error("❌ Google login error:", err);
    return res.status(500).json({ message: "Authentication failed" });
  }
};

// ============================================================
// STEP 3 — Accept Google Terms
// ============================================================
exports.acceptGoogleTerms = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.json({ success: false, message: "Email not provided" });

    await prisma.user.update({
      where: { email },
      data: {
        termsAccepted: true,
        termsAcceptedAt: new Date(),
      },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ Error accepting Google terms:", err);
    return res.json({ success: false, message: "Server error" });
  }
};

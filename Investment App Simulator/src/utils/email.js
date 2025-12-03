require("dotenv").config();
const nodemailer = require("nodemailer");

// -----------------------------------------------------------------------------
// GLOBAL EMAIL WRAPPER — premium white card, dark-mode safe, no logo
// -----------------------------------------------------------------------------
function blackSealedWrapper(content) {
  return `
  <!-- Load Outfit font -->
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <!-- Prevent dark mode inversion -->
  <style>
    :root {
      color-scheme: light;
      supported-color-schemes: light;
    }

    html, body, .email-container {
      background: #ffffff !important;
      color: #0f172a !important; /* slate-900 */
      -webkit-text-size-adjust: none !important;
    }

    /* Gmail iOS Fix */
    u + .body .email-container {
      background: #ffffff !important;
    }

    .no-invert {
      filter: none !important;
      -webkit-filter: none !important;
    }
  </style>

  <div class="email-container no-invert" style="
    background:#ffffff;
    padding:40px;
    border-radius:18px;
    max-width:580px;
    margin:auto;
    color:#0f172a;
    font-family:'Outfit', Arial, sans-serif;
    border:1px solid rgba(0,0,0,0.08);
  ">

    <!-- BRANDING — pure text, premium look -->
    <div style="
      text-align:center;
      font-size:2rem;
      font-weight:700;
      margin-bottom:26px;
      color:#000000;
      letter-spacing:-0.4px;
    ">
      BlackSealed
    </div>

    ${content}

    <!-- FOOTER -->
    <div style="
      margin-top:40px;
      padding-top:20px;
      border-top:1px solid rgba(0,0,0,0.08);
      text-align:center;
      font-size:0.8rem;
      color:#6b7280;
      line-height:1.6;
    ">
      © 2025 BlackSealed. All rights reserved.<br>
      Simulation platform — not financial advice.<br>
      <a href="mailto:${process.env.EMAIL_USER}" style="color:#3b82f6; text-decoration:none;">
        ${process.env.EMAIL_USER}
      </a>
    </div>

  </div>
  `;
}

// -----------------------------------------------------------------------------
// TRANSPORTER (Gmail)
// -----------------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// -----------------------------------------------------------------------------
// VERIFICATION EMAIL
// -----------------------------------------------------------------------------
async function sendVerificationEmail(email, token) {
  const link = `${process.env.APP_URL}/user/verify/${token}`;

  const html = blackSealedWrapper(`
    <h2 style="
      text-align:center;
      color:#111;
      font-size:1.8rem;
      font-weight:700;
      margin-bottom:10px;
    ">Verify Your Email</h2>

    <p style="
      text-align:center;
      color:#444;
      line-height:1.6;
      margin-bottom:26px;
    ">
      Welcome to <strong>BlackSealed</strong> — the next generation of simulated trading.<br>
      Click the button below to verify your email.
    </p>

    <div style="text-align:center; margin:28px 0;">
      <a href="${link}" style="
        display:inline-block;
        background:#000;
        color:#fff;
        padding:14px 34px;
        border-radius:12px;
        text-decoration:none;
        font-size:1rem;
        font-weight:600;
      ">Verify Email</a>
    </div>

    <p style="text-align:center; color:#666; margin-bottom:6px;">Or copy this link:</p>

    <p style="text-align:center; word-break:break-all; color:#000; font-size:0.9rem;">
      ${link}
    </p>

    <p style="
      text-align:center;
      margin-top:25px;
      font-size:0.85rem;
      color:#777;
    ">This verification link expires in 1 hour.</p>
  `);

  await transporter.sendMail({
    from: `"BlackSealed" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify your BlackSealed account",
    html,
  });

  console.log("✅ Verification email sent to:", email);
}

// -----------------------------------------------------------------------------
// PASSWORD RESET EMAIL
// -----------------------------------------------------------------------------
async function sendPasswordResetCode(email, code) {
  const html = blackSealedWrapper(`
    <h2 style="
      text-align:center;
      color:#111;
      font-size:1.8rem;
      font-weight:700;
      margin-bottom:12px;
    ">Reset Your Password</h2>

    <p style="
      text-align:center;
      color:#444;
      margin-bottom:24px;
      line-height:1.6;
    ">
      Use the code below to reset your BlackSealed password.
    </p>

    <div style="
      text-align:center;
      font-size:2.4rem;
      font-weight:700;
      letter-spacing:12px;
      color:#000;
      margin:32px 0;
    ">${code}</div>

    <p style="
      text-align:center;
      color:#777;
      font-size:0.9rem;
    ">This code expires in 15 minutes.</p>

    <p style="
      text-align:center;
      margin-top:20px;
      font-size:0.85rem;
      color:#777;
    ">If you didn’t request this, you can safely ignore it.</p>
  `);

  await transporter.sendMail({
    from: `"BlackSealed" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your BlackSealed Password Reset Code",
    html,
  });

  console.log("✅ Password reset code sent to:", email);
}

// -----------------------------------------------------------------------------
// EXPORTS
// -----------------------------------------------------------------------------
module.exports = { sendVerificationEmail, sendPasswordResetCode };

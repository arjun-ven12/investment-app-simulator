require("dotenv").config();
const nodemailer = require("nodemailer");

async function sendVerificationEmail(email, token) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 💎 Use clean route
    const link = `${process.env.APP_URL}/user/verify/${token}`;

    const info = await transporter.sendMail({
      from: `"Sealed Paper Trading" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your email address",
      html: `
        <div style="font-family:Outfit, sans-serif; background:#fafafa; padding:30px; border-radius:12px; max-width:500px; margin:auto; color:#111;">
          <h2 style="text-align:center; color:#2563eb; margin-bottom:0.5rem;">Sealed Paper Trading</h2>
          <p style="text-align:center; margin-bottom:1.5rem;">Welcome aboard! Please verify your email address to activate your account.</p>
          <div style="text-align:center; margin:20px 0;">
            <a href="${link}" style="display:inline-block; background:#2563eb; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">Verify Email</a>
          </div>
          <p style="text-align:center; color:#555;">Or copy and paste this link into your browser:</p>
          <p style="word-break:break-all; text-align:center; color:#2563eb;">${link}</p>
          <p style="text-align:center; margin-top:1rem; font-size:0.9rem; color:#777;">This link expires in 1 hour.</p>
        </div>
      `,
    });

    console.log("✅ Verification email sent:", info.messageId);
  } catch (err) {
    console.error("❌ Email send error:", err);
    throw err;
  }
}

async function sendPasswordResetCode(email, code) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Sealed Paper Trading" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your Password Reset Code",
      html: `
        <div style="font-family:Outfit, sans-serif; color:#111; background:#fafafa; padding:30px; border-radius:10px; max-width:500px; margin:auto;">
          <h2 style="text-align:center; color:#2563eb;">Sealed Paper Trading</h2>
          <p style="text-align:center;">Use the code below to reset your password:</p>
          <h1 style="text-align:center; font-size:2.5rem; letter-spacing:6px; color:#2563eb;">${code}</h1>
          <p style="text-align:center;">This code will expire in 15 minutes.</p>
          <p style="text-align:center; font-size:0.9rem; color:#666;">If you didn’t request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    });

    console.log("✅ Password reset code sent:", info.messageId);
  } catch (err) {
    console.error("❌ Password reset code email error:", err);
    throw err;
  }
}

module.exports = { sendVerificationEmail, sendPasswordResetCode };

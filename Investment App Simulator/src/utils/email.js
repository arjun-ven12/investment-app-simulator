require("dotenv").config();
const nodemailer = require("nodemailer");

async function sendVerificationEmail(email, token) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail", // 👈 Gmail helper for App Passwords
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // your 16-char app password
      },
    });

    const link = `${process.env.APP_URL}/user/verify?token=${token}`;

    const info = await transporter.sendMail({
      from: `"Sealed Paper Trading" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your email address",
      html: `
        <h3>Welcome to Sealed Paper Trading!</h3>
        <p>Click below to verify your email:</p>
        <a href="${link}" style="color:#2563eb;">${link}</a>
        <p>This link expires in 1 hour.</p>
      `,
    });
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "Exists" : "Missing");
    console.log("✅ Verification email sent:", info.messageId);
  } catch (err) {
    console.error("❌ Email send error:", err);
    throw err; // allow controller to catch it
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

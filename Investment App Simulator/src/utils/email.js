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

async function sendPasswordResetEmail(email, token) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const link = `${process.env.APP_URL}/reset-password.html?token=${token}`;

    const info = await transporter.sendMail({
      from: `"Sealed Paper Trading" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset your password",
      html: `
        <h3>Password Reset Request</h3>
        <p>Click below to reset your password:</p>
        <a href="${link}" style="color:#2563eb;">${link}</a>
        <p>This link expires in 1 hour.</p>
      `,
    });

    console.log("✅ Password reset email sent:", info.messageId);
  } catch (err) {
    console.error("❌ Password reset email error:", err);
    throw err;
  }
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };

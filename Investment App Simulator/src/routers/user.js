const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const prisma = require("../../prisma/prismaClient");
router.post('/register', userController.register);
router.post('/login', userController.login);

router.get('/get/:userId', userController.getUserDetails);
router.post("/forgot-password", userController.forgotPassword);
router.post("/verify-reset-code", userController.verifyResetCode);
router.post("/reset-password", userController.resetPassword);
router.post("/verify-reset-code", userController.verifyResetCode);
router.post("/resend-verification", userController.resendVerification);
router.post("/get-email", async (req, res) => {
  const { username } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(404).json({ message: "No account found" });
  res.json({ email: user.email });
});
router.get("/verify", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send("Missing token.");

  try {
    const user = await prisma.user.findFirst({
      where: { verifyToken: token, verifyExpires: { gt: new Date() } },
    });
    if (!user) return res.status(400).send("Invalid or expired verification link.");

    await prisma.user.update({
      where: { id: user.id },
      data: { verified: true, verifyToken: null, verifyExpires: null },
    });

    res.send("✅ Email verified! You can now log in.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error.");
  }
});

module.exports = router;

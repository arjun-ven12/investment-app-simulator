const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const prisma = require("../../prisma/prismaClient");
const jwtMiddleware = require('../middlewares/jwtMiddleware');
router.post('/register', userController.register);
router.post('/login', userController.login);

router.get('/get/:userId', jwtMiddleware.verifyToken, userController.getUserDetails);
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

router.get("/verify/:token", async (req, res) => {
  const { token } = req.params; // ✅ Use req.params, not req.query
  if (!token) return res.status(400).send("Missing token.");

  try {
    const user = await prisma.user.findFirst({
      where: {
        verifyToken: token,
        verifyExpires: { gt: new Date() },
      },
    });

    if (!user) {
      // redirect to a styled "failed" page
      return res.redirect("/html/verify-failed.html");
    }

    // ✅ Mark user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { verified: true, verifyToken: null, verifyExpires: null },
    });

    // redirect to pretty confirmation page
    res.redirect("/html/email-verified.html");
  } catch (err) {
    console.error(err);
    res.redirect("/html/verify-failed.html");
  }
});


module.exports = router;

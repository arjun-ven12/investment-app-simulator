const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwtMiddleware = require('../middlewares/jwtMiddleware');

const prisma = new PrismaClient();

/**
 * Route to fetch user details by ID (using JWT)
 */
router.get('/user/details', jwtMiddleware.verifyToken, async (req, res) => {
    try {
        const userId = req.user.id; // Assuming `id` is stored in the token
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            username: user.username,
            wallet: user.wallet,
        });
    } catch (error) {
        console.error("Error fetching user details:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * Route to fetch user information by username (optional)
 */
router.get('/info', async (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ message: "Username is required" });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            username: user.username,
            wallet: user.wallet,
        });
    } catch (error) {
        console.error("Error fetching user info:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters, include uppercase, lowercase, a number, and a special character."
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });

    if (existingUser) {
      return res.status(409).json({ message: "Username or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Use a transaction to create user + referral atomically
    const [newUser, newReferral] = await prisma.$transaction([
      prisma.user.create({
        data: { username, email, password: hashedPassword },
        select: { id: true, username: true, email: true }
      }),
      // We’ll create referral after we have the userId
    ]).then(async ([user]) => {
      const referral = await prisma.referral.create({
        data: {
          userId: user.id,
          referralLink: `https://www.fintech.com/referral/${Math.random().toString(36).substring(2, 9)}`,
          referralSignups: 0,
          successfulReferrals: 0,
          rewardsExchanged: 0,
          creditsEarned: 0,
          wallet: 100000,
        }
      });
      return [user, referral];
    });

    res.status(201).json({ message: "User registered successfully", user: newUser, referral: newReferral });

  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


/**
 * Route to login a user
 */
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, {
            expiresIn: process.env.JWT_EXPIRES_IN || "1h",
        });

        res.status(200).json({
            message: "Login successful",
            userId: user.id,
            username: user.username,
            token,
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;

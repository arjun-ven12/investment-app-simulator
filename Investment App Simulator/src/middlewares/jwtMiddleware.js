require('dotenv').config();
const jwt = require('jsonwebtoken');
const prisma = require("../../prisma/prismaClient");

// Generate JWT token
module.exports.generateToken = async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                username: true,
                email: true,
                googleId: true,
                microsoftId: true
            }
        });

        const authProvider = user.googleId
            ? "google"
            : user.microsoftId
            ? "microsoft"
            : "normal";

        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                email: user.email,
                googleId: user.googleId,
                microsoftId: user.microsoftId,
                authProvider
            },
            process.env.JWT_SECRET_KEY,
            { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
        );

        res.locals.token = token;
        next();
    } catch (error) {
        console.error("Error generating token:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Send token to client
module.exports.sendToken = (req, res) => {
    res.status(200).json({
        message: "Success",
        token: res.locals.token,
    });
};

// Verify JWT token
module.exports.verifyToken = (req, res, next) => {
    try {
        const token = req.headers["authorization"]?.split(" ")[1];

        if (!token) {
            return res.status(401).json({ message: "Access token missing" });
        }

        jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
            if (err) {
                return res
                    .status(403)
                    .json({ message: "Invalid or expired token" });
            }

            req.user = decoded; 
            next();
        });
    } catch (error) {
        console.error("Token verification error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

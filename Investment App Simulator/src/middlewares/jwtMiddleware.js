// //////////////////////////////////////////////////////
// // REQUIRE DOTENV MODULE
// //////////////////////////////////////////////////////
// require("dotenv").config();

// //////////////////////////////////////////////////////
// // REQUIRE JWT MODULE
// //////////////////////////////////////////////////////
// const jwt = require("jsonwebtoken");

// //////////////////////////////////////////////////////
// // SET JWT CONFIGURATION
// //////////////////////////////////////////////////////
// const secretKey = process.env.JWT_SECRET_KEY || "default_secret_key";
// const tokenDuration = process.env.JWT_EXPIRES_IN || "1h";
// const tokenAlgorithm = process.env.JWT_ALGORITHM || "HS256";

// //////////////////////////////////////////////////////
// // MIDDLEWARE FUNCTION FOR GENERATING JWT TOKEN
// //////////////////////////////////////////////////////
// module.exports.generateToken = (req, res, next) => {
//   const { id } = req.user;

//   console.log('Generating token for user ID:', id); // Debug log

//   try {
//       const token = jwt.sign({ userId: id }, process.env.JWT_SECRET_KEY, {
//           expiresIn: process.env.JWT_EXPIRES_IN || '1h',
//       });
//       req.token = token; // Attach token to the request
//       next();
//   } catch (error) {
//       console.error('Error generating token:', error.message);
//       res.status(500).json({ message: 'Internal server error' });
//   }
// };

// //////////////////////////////////////////////////////
// // MIDDLEWARE FUNCTION FOR SENDING JWT TOKEN
// //////////////////////////////////////////////////////
// module.exports.sendToken = (req, res) => {
//   console.log("Sending Token:", res.locals.token);
//   res.status(200).json({
//     message: "Authentication successful",
//     token: res.locals.token,
//     userId: res.locals.userId
//   });
// };

// //////////////////////////////////////////////////////
// // MIDDLEWARE FUNCTION FOR VERIFYING JWT TOKEN
// //////////////////////////////////////////////////////
// module.exports.verifyToken = (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return res.status(401).json({ error: 'No token provided' });
//   }

//   const token = authHeader.substring(7); // Extract token from "Bearer <token>"

//   try {
//     const decoded = jwt.verify(token, secretKey); // Verify token
//     res.locals.userId = decoded.userId;
//     res.locals.tokenTimestamp = decoded.timestamp;

//     next(); // Proceed to the next middleware
//   } catch (error) {
//     console.error("Error verifying JWT token:", error);
//     return res.status(401).json({ error: "Invalid token" });
//   }
// };


const jwt = require('jsonwebtoken');

module.exports.generateToken = (req, res, next) => {
    try {
        const token = jwt.sign({ userId: res.locals.userId }, process.env.JWT_SECRET_KEY, {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        });

        res.locals.token = token;
        next();
    } catch (error) {
        console.error('Error generating token:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports.sendToken = (req, res) => {
    res.status(200).json({ message: 'Success', token: res.locals.token });
};

module.exports.verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization header missing or invalid' });
    }

    const token = authHeader.split(' ')[1]; // Extract the token from the header

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY); // Verify the token
        req.user = decoded; // Attach user info to req
        next();
    } catch (error) {
        console.error('JWT verification error:', error.message);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};


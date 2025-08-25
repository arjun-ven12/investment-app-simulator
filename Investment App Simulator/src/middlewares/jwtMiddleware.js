require('dotenv').config();
const jwt = require('jsonwebtoken');

// Generate JWT token
module.exports.generateToken = (req, res, next) => {
    try {
        const token = jwt.sign(
            { id: req.user.id, username: req.user.username }, 
            process.env.JWT_SECRET_KEY, 
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );

        res.locals.token = token;
        next();
    } catch (error) {
        console.error('Error generating token:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Send token to client
module.exports.sendToken = (req, res) => {
    res.status(200).json({
        message: 'Success',
        token: res.locals.token,
        id: req.user.id,
        username: req.user.username,
    });
};

// Verify JWT token
module.exports.verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

        if (!token) {
            return res.status(401).json({ message: 'Access token missing' });
        }

        jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: 'Invalid or expired token' });
            }

            // ✅ Attach decoded user info to req.user
            req.user = {
                id: decoded.id,
                username: decoded.username,
                tokenTimestamp: decoded.timestamp, // optional
            };

            next();
        });
    } catch (error) {
        console.error('Token verification error:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel'); // or wherever your DB functions are

module.exports.loginUser = async (req, res) => {
    try {
        const { name, password } = req.body;
        if (!name || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // Fetch user by username
        const user = await userModel.getUserIdByName(name);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ message: 'Invalid password' });

        // Generate JWT
        const payload = { id: user.id, username: user.username, timestamp: new Date() };
        const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h',
            algorithm: process.env.JWT_ALGO || 'HS256',
        });

        // Return response
        return res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const userController = require('../controllers/userController');

module.exports.loginUser = async (req, res) => {
    const { name, password } = req.body;

    try {
        console.log('Login request for name:', name);

        // Fetch user by name
        const user = await userController.getUserIdByName(name);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        // Generate token
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET_KEY, {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        });

        return res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Error during login:', error.message, error.stack);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

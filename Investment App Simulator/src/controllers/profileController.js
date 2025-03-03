const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ user: { id: user.id, email: user.email, name: user.name, phoneNumber: user.phoneNumber } });
    } catch (error) {
        console.error('Error fetching profile:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.updatePhoneNumber = async (req, res) => {
    try {
        const { userId, phoneNumber, password } = req.body;

        if (!userId || !phoneNumber || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

         // Convert phoneNumber to an integer
        const parsedPhoneNumber = parseInt(phoneNumber, 10);
        if (isNaN(parsedPhoneNumber)) {
            return res.status(400).json({ message: 'Invalid phone number' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Incorrect password' });
        }
         await prisma.user.update({
            where: { id: userId },
            data: { phoneNumber: parsedPhoneNumber },
        });

        res.status(200).json({ message: 'Phone number updated successfully' });
    } catch (error) {
        console.error('Error updating phone number:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
     //   const userId = req.user.userId;
        const { userId, password } = req.body;

        const parsedUserId = parseInt(userId, 10);
        if (isNaN(parsedUserId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        const user = await prisma.user.findUnique({ where: { id: parsedUserId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        await prisma.user.delete({ where: { id: parsedUserId } });

        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting account:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

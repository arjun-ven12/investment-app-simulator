const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


//////////////////////////////////////////////////////
// CHECK DUPLICATE EMAIL OR USERNAME
//////////////////////////////////////////////////////
module.exports.checkDuplicatedEmailOrName = async (req, res, next) => {
    const { username, email } = req.body;

    try {
        const duplicateUsername = await prisma.user.findFirst({
            where: { name: username },
        });

        if (duplicateUsername) {
            return res.status(409).json({ message: 'Username already exists' });
        }

        const duplicateEmail = await prisma.user.findFirst({
            where: { email },
        });

        if (duplicateEmail) {
            return res.status(409).json({ message: 'Email already exists' });
        }

        next();
    } catch (error) {
        console.error('Error checking duplicates:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

///////////////////////////////////////////////////////
// REGISTER NEW USER
//////////////////////////////////////////////////////
module.exports.register = async (req, res, next) => {
    const { username, email } = req.body;
    const password = res.locals.hash; // Hashed password from bcryptMiddleware

    try {
        const newUser = await prisma.user.create({
            data: {
                name: username,
                email,
                password,
            },
        });

        res.locals.userId = newUser.id; // Store user ID for JWT generation
        next();
    } catch (error) {
        console.error('Error creating new user:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

//////////////////////////////////////////////////////
// USER LOGIN
//////////////////////////////////////////////////////
module.exports.loginUser = async (name) => {
    console.log('Fetching user with name:', name); // Debug log
    try {
        const user = await prisma.user.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive', // Case-insensitive match
                },
            },
        });
        console.log('Fetched user:', user); // Log the fetched user
        return user;
    } catch (error) {
        console.error('Error fetching user:', error.message);
        throw error;
    }
};

//////////////////////////////////////////////////////
// CHECK DUPLICATE EMAIL
//////////////////////////////////////////////////////
module.exports.CheckDuplicateEmail = async (req, res, next) => {
    const { email } = req.body;

    try {
        const duplicateEmail = await prisma.user.findFirst({
            where: { email },
        });

        if (duplicateEmail) {
            return res.status(409).json({ message: 'Email is already in use' });
        }

        next();
    } catch (error) {
        console.error('Error checking duplicate email:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};


//////////////////////////////////////////////////////
// GET ALL USERS
//////////////////////////////////////////////////////
module.exports.GetAllUser = async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.status(200).json(users);
    } catch (error) {
        console.error('Error retrieving all users:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

//////////////////////////////////////////////////////
// GET USER BY ID
//////////////////////////////////////////////////////
module.exports.GetUserById = async (req, res) => {
    const { user_id } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(user_id, 10) },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error retrieving user by ID:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

//////////////////////////////////////////////////////
// UPDATE USER BY ID
//////////////////////////////////////////////////////
module.exports.updateUserById = async (req, res) => {
    const { user_id } = req.params;
    const { username, email } = req.body;

    if (!username || !email) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(user_id, 10) },
            data: { name: username, email },
        });

        res.status(200).json({ message: 'User updated successfully', user: updatedUser });
    } catch (error) {
        console.error('Error updating user:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};


//////////////////////////////////////////////////////
// DELETE USER BY ID
//////////////////////////////////////////////////////
module.exports.DeleteByUserId = async (req, res) => {
    const { user_id } = req.params;

    try {
        await prisma.user.delete({
            where: { id: parseInt(user_id, 10) },
        });

        res.status(204).send(); // No content
    } catch (error) {
        console.error('Error deleting user:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};


//////////////////////////////////////////////////////
// GET USER DETAILS BY USERNAME
//////////////////////////////////////////////////////
module.exports.getUserDetailsByUsername = async (req, res) => {
    try {
      const { username } = req.query;
  
      if (!username) {
        return res.status(400).json({ message: "Username is required." });
      }
  
      const user = await prisma.user.findUnique({
        where: { username },
        select: { username: true, wallet: true },
      });
  
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      return res.status(200).json(user);
    } catch (error) {
      console.error("Error fetching user details:", error.message);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
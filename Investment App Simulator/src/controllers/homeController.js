const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get user information by username.
 * @param {string} username - The username of the user.
 */
module.exports.getUserInfo = async (username) => {
    try {
        const user = await prisma.user.findUnique({
            where: { username },
            select: {
                username: true,
                wallet: true,
            },
        });

        if (!user) {
            throw new Error("User not found");
        }

        return user;
    } catch (error) {
        console.error("Error fetching user info:", error.message);
        throw error;
    }
};

/**
 * Register a new user.
 * @param {Object} userData - Object containing user data.
 * @returns {Object} - Created user data.
 */
module.exports.registerUser = async (userData) => {
    try {
        const { username, email, password } = userData;

        // Check for existing username or email
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email },
                ],
            },
        });

        if (existingUser) {
            throw new Error("Username or email already exists");
        }

        // Create the new user
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
            },
        });

        return { id: newUser.id, username: newUser.username };
    } catch (error) {
        console.error("Error registering user:", error.message);
        throw error;
    }
};

/**
 * Authenticate a user during login.
 * @param {string} username - Username of the user.
 * @param {string} password - Password of the user.
 * @returns {Object} - Authenticated user details and JWT token.
 */
module.exports.authenticateUser = async (username, password) => {
    try {
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            throw new Error("User not found");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error("Invalid password");
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, {
            expiresIn: process.env.JWT_EXPIRES_IN || "1h",
        });

        return {
            userId: user.id,
            username: user.username,
            token,
        };
    } catch (error) {
        console.error("Error during authentication:", error.message);
        throw error;
    }
};

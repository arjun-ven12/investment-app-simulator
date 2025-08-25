const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


  module.exports = {
    selectUserByUsername: async (username) => {
      try {
        return await prisma.user.findUnique({
          where: {
            username: username, // Ensure this field matches your Prisma schema
          },
        });
      } catch (error) {
        console.error("Error in selectUserByUsername:", error);
        throw error;
      }
    },

  selectAllUsersWithPoints: async () => {
    return await prisma.user.findMany({
      include: {
        referrals: true,
      },
    });
  },

  checkDuplicateEmail: async (email) => {
    return await prisma.user.findUnique({
      where: { email },
    });
  },

  insertSingleUser: async (data) => {
    return await prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        name: data.username,
      },
    });
  },

  selectByUserId: async (user_id) => {
    return await prisma.user.findUnique({
      where: { id: userid },
    });
  },

  updateByUserId: async (data) => {
    return await prisma.user.update({
      where: { id: data.userid },
      data: {
        email: data.email,
        name: data.username,
      },
    });
  },

  deleteByUserId: async (user_id) => {
    return await prisma.user.delete({
      where: { id: userid },
    });
  },

  getUserIdByName: async (username) => {
    return await prisma.user.findUnique({
      where: { name: username },
    });
  },

  selectByEmail: async (email) => {
    return await prisma.user.findUnique({
      where: { email },
    });
  },

   /**
     * Get user by username.
     * @param {string} username - Username to search for.
     */
   getUserByUsername: async (username) => {
    return prisma.user.findUnique({
        where: { username },
    });
},

/**
 * Create a new user.
 * @param {Object} userData - User data to insert.
 */
createUser: async (userData) => {
    return prisma.user.create({
        data: userData,
    });
},

/**
 * Check if a username or email exists.
 * @param {string} username - Username to check.
 * @param {string} email - Email to check.
 */
checkUserExists: async (username, email) => {
    return prisma.user.findFirst({
        where: {
            OR: [
                { username },
                { email },
            ],
        },
    });
},
  
};

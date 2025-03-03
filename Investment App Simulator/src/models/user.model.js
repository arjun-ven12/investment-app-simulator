// const pool = require('../services/db');


// module.exports.SelectAllUser = (data, callback) =>
// {
//     const SQLSTATMENT = `
//     SELECT 
//     user.user_id, user.username, user.email, COALESCE(SUM(task.points), 0) AS 'points'
//     FROM user
//     LEFT JOIN taskprogress ON user.user_id = taskprogress.user_id
//     LEFT JOIN task ON taskprogress.task_id = task.task_id
//     GROUP BY user.user_id, user.username, user.email;
//         `;
//     const VALUES = [data.user_id];

// pool.query(SQLSTATMENT, VALUES, callback);
// }





// module.exports.CheckDuplicateEmail = (data, callback) => {
//     const SQLSTATEMENT = `
//     SELECT * FROM User
//     WHERE email = ?;
//     `;

//     const VALUES = [data.email];

//     pool.query(SQLSTATEMENT, VALUES, callback);

// }


// module.exports.InsertSingleUser = (data, callback) => {
//     const SQLSTATMENT = `
//     INSERT INTO User (username, email, password)
//     VALUES (?, ?, ?);
//     `;
//     const VALUES = [data.username, data.email, data.password];

//     pool.query(SQLSTATMENT, VALUES, callback);

// }


// module.exports.SelectAllUser = (callback) => {

//     const SQLSTATMENT = `
//     SELECT * FROM User
//     `;

//     pool.query(SQLSTATMENT, callback);

// }


// module.exports.SelectByUserId = (data, callback) => {
//     const SQLSTATMENT = `
//     SELECT * FROM User
//     WHERE user_id = ?;
//     `;
//     const VALUES = [data.user_id];

//     pool.query(SQLSTATMENT, VALUES, callback);

// }




// module.exports.updateByUserId = (data, callback) => {
//     const SQLSTATMENT = `
//     UPDATE User 
//     SET username = ?, email = ?
//     WHERE user_id = ?;
//     `;
// const VALUES = [data.username, data.email, data.user_id];

// pool.query(SQLSTATMENT, VALUES, callback);


// }



// module.exports.DeleteByUserId = (data, callback) => {
//     const SQLSTATMENT = `
//     DELETE FROM User 
//     WHERE user_id = ?;

//     `;
// const VALUES = [data.user_id];

// pool.query(SQLSTATMENT, VALUES, callback);

// }

// module.exports.getUserIdByName = (data, callback)=>{
//     const SQLSTATEMENT = `
//     SELECT * FROM User
//     WHERE username = ?`
//     const VALUES = [data.username];
//     pool.query(SQLSTATEMENT, VALUES, callback);
// }

// module.exports.selectByEmail = (email, callback) => {
//     const SQLSTATEMENT = `
//         SELECT * FROM User 
//         WHERE email = ?;
//     `;
//     const VALUES = [email];

//     pool.query(SQLSTATEMENT, VALUES, callback);
// };

// module.exports.selectByUsername = (username, callback) => {
//     const SQLSTATEMENT = `
//         SELECT * FROM User 
//         WHERE username = ?;
//     `;
//     const VALUES = [username];

//     pool.query(SQLSTATEMENT, VALUES, callback);
// };

// module.exports.selectUserByUsername = (data, callback) => {
//     const SQLSTATMENT =`
//     SELECT * FROM User
//     WHERE username = ?
//     `;
//     const VALUES = [data.username];

//     pool.query(SQLSTATMENT, VALUES, callback);
// }


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

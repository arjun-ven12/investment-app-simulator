// const model = require("../models/user.model");


// module.exports.CheckDuplicateEmail = (req, res, next) => {
//     const callback = (error, results, fields) => {
//         if (error) {
//             console.error(error);
//             res.status(500).json(error);
//             return;
//         }

//         if (results.length > 0) {
//             res.status(409).json({
//                 message: "Email is already in use"
//             })
//             return;
//         }

//         next();
//     }
//     const data = { email: req.body.email };

//     model.CheckDuplicateEmail(data, callback);

// }


// module.exports.CreateNewUser = (req, res, next) => {
//     if (req.body.username == undefined) {
//         res.status(400).send("Error: username/email is missing");
//         return;
//     }

//     const data = {
//         user_id: req.params.user_id,
//         username: req.body.username,
//         email: req.body.email,
//         password: req.body.password
//     }


//     const callback = (error, results, fields) => {
//         if (error) {
//             console.error("Error createNewUser:", error);
//             res.status(500).json(error);
//             return;
//         }

//         res.locals.insertId = results.insertId;

//         next();


//     }
//     model.InsertSingleUser(data, callback);
// };


// module.exports.getCreatedId = (req, res, next) => {
//     if (req.body.username == undefined) {
//         res.status(400).send("Error: username/email is missing");
//         return;
//     }
//     const callback = (error, results, fields) => {
//         if (error) {
//             console.error(error);
//             res.status(500).json(error);
//             return;
//         } else {
//             res.status(201).json({
//                 ...data
//             });
//         }
//         return;
//     }

//     const data = {
//         user_id: res.locals.insertId,
//         username: req.body.username,
//         email: req.body.email,
//         password:req.body.password
//     }

//     model.SelectByUserId(data, callback);
// }


// module.exports.GetAllUser = (req, res, next) => {
//     const callback = (error, results, fields) => {
//         if (error) {
//             console.error("Error GetAllUser:", error);
//             res.status(500).json(error);
//         }
//         else res.status(200).json(results);
//     }

//     model.SelectAllUser(callback);
// }


// module.exports.GetUserById = (req, res, next) => {
//     const data = {
//         user_id: req.params.user_id,
//         username: req.body.username,
//         email: req.body.email
//         // total_points: req.body.total_points
//     }

//     const callback = (error, results, fields) => {
//         if (error) {
//             console.error("Error GetUserById:", error);
//             res.status(500).json(error);
//         } else {
//             if (results.length == 0) {
//                 res.status(404).json({
//                     message: "User not found"
//                 });
//             }
//             else res.status(200).json(results[0]);
//         }
//     }

//     model.SelectByUserId(data, callback);
// }


// module.exports.updateUserById = (req, res, next) => {
//     if (req.body.username == undefined || req.body.email == undefined) {
//         res.status(400).json({
//             message: "Error: username or email or password is undefined"
//         });
//         return;
//     }

//     const data = {
//         user_id: req.params.user_id,
//         username: req.body.username,
//         email: req.body.email,
//     }

//     const callback = (error, results, fields) => {
//         if (error) {
//             console.error("Error updateUserById:", error);
//             res.status(500).json(error);
//         } else {
//             if (results.affectedRows == 0) {
//                 res.status(404).json({
//                     message: "User not found"
//                 });
//             }
//             else {
//                 const user = {
//                     user_id: results.insertId,
//                     username: req.body.username,
//                     email: req.body.email
//                 }
//                 res.status(200).json({ ...user })
//             }; // 204 No Content
//         }
//     }

//     model.updateByUserId(data, callback);
// }


// module.exports.DeleteByUserId = (req, res, next) =>
// {
//     const data = {
//         user_id: req.params.user_id
//     }

//     const callback = (error, results, fields) => {
//         if (error) {
//             console.error("Error deleteUserById:", error);
//             res.status(500).json(error);
//         } else {
//             if(results.affectedRows == 0) 
//             {
//                 res.status(404).json({
//                     message: "User not found"
//                 });
//             }
//             else res.status(204).send(); // 204 No Content            
//         }
//     }

//     model.DeleteByUserId(data, callback);
// }


// module.exports.checkDuplicatedEmailorName= (req, res, next) => {

//     const data = {
//         user_id: req.params.user_id,
//         username: req.body.username,
//         email: req.body.email,
//         password: req.body.password
//     }
  
//     const checkDuplicatedUsername = (error, results, fields) => {
//         if (error) {
//             console.error("Error checking duplicated username:", error);
//             return res.status(500).json(error);
//         }
  
//         if (results.length > 0) {
//             return res.status(409).send({
//                 message: "Username or email already exists"
//             });
//         }
  
//         checkDuplicateEmail();
//     };
  
//     const checkDuplicateEmail = () => {
//         model.selectByEmail(data.email, (error, results, fields) => {
//             if (error) {
//                 console.error("Error checking duplicate email:", error);
//                 return res.status(500).json(error);
//             }
  
//             if (results.length > 0) {
//                 return res.status(409).send({
//                     message: "Username or email already exists"
//                 });
//             }
  
//             next()
//         });
//     };
  
  
//     model.getUserIdByName(data.username, checkDuplicatedUsername);
//   };
  
  
//   module.exports.register = (req, res, next) => {
//     if (!req.body.username || !req.body.email || !req.body.password) {
//         res.status(400).send("Error: data is undefined");
//         return;
//     }
  
//     const data = {
//         username: req.body.username,
//         email: req.body.email,
//         password: res.locals.hash
//     }
  
//     const callback = (error, results, fields) => {
//         if (error) {
//             console.error("Error createNewUser:", error);
//             res.status(500).json(error);
//         } else {
//             res.status(200).json({
//                 message: `User ${data.username} created successfully.`,
//                 user: data
//             });
  
//             if (results && results.insertId) {
//                 res.locals.userId = results.insertId;
//             }
  
//             next()
//         }
//     }
  
//     model.InsertSingleUser(data, callback);
//   }
  
  
//   module.exports.login = (req, res, next) => {
//     if (!req.body.username || !req.body.password) {
//         res.status(401).json({
//             message: "Missing data"
//         });
//         return;
//     }

//     const data = {
//         username: req.body.username
//     };

//     model.selectUserByUsername(data, (error, results, fields) => {
//         if (error) {
//             console.error("SQL Error: ", error);
//             res.status(500).json(error);
//             return;
//         }

//         if (results.length === 0) {
//             res.status(404).json({
//                 message: "User not found"
//             });
//             return;
//         }

//         res.locals.hash = results[0].password;
//         res.locals.userId = results[0].user_id;
//         next();
//     })
// }

// module.exports.getUserIdByUsername=(req,res,next)=>{
//     const data = {
//         username: req.body.username
//     }
    
//     const callback = (error, results, fields) => {
//         if (error) {
//             console.error("Error readTaskById:", error);
//             res.status(500).json(error);
//         } else {
//             if(results.length == 0) 
//             {
//                 res.status(404).json({
//                     message: "404 Not Found"
//                 });
//             }
//             else{
//                 res.locals.userId = results[0].user_id;
//                 next();
//             }
//         }
//     }    
//     model.getUserIdByName(data, callback);
// }




const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Check for duplicate email or username
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

// Create a new user
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

// Login user
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

// Check for duplicate email
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

// Get all users
module.exports.GetAllUser = async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.status(200).json(users);
    } catch (error) {
        console.error('Error retrieving all users:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get user by ID
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

// Update user by ID
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

// Delete user by ID
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
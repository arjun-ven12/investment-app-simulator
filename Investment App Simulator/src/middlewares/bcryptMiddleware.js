// //////////////////////////////////////////////////////
// // REQUIRE BCRYPT MODULE
// //////////////////////////////////////////////////////
// const bcrypt = require("bcrypt");

// //////////////////////////////////////////////////////
// // SET SALT ROUNDS
// //////////////////////////////////////////////////////
// const saltRounds = 10;

// //////////////////////////////////////////////////////
// // MIDDLEWARE FUNCTION FOR COMPARING PASSWORD
// //////////////////////////////////////////////////////
// module.exports.comparePassword = async (req, res, next) => {
//   const { password } = req.body;
//   const { password: hash } = req.user;

//   console.log('Comparing passwords:', { plainText: password, hash }); // Debug log

//   try {
//       const isValid = await bcrypt.compare(password, hash);
//       if (!isValid) {
//           console.log('Invalid password');
//           return res.status(401).json({ message: 'Invalid password' });
//       }
//       next();
//   } catch (error) {
//       console.error('Error comparing passwords:', error.message);
//       res.status(500).json({ message: 'Internal server error' });
//   }
// };

// //////////////////////////////////////////////////////
// // MIDDLEWARE FUNCTION FOR HASHING PASSWORD
// //////////////////////////////////////////////////////
// module.exports.hashPassword = async (req, res, next) => {
//   try {
//     // Hash the password with the defined salt rounds
//     const hash = await bcrypt.hash(req.body.password, saltRounds);
//     res.locals.hash = hash; // Store hash in res.locals for further use
//     next();
//   } catch (error) {
//     console.error("Error hashing password:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };


const bcrypt = require('bcrypt');

module.exports.hashPassword = async (req, res, next) => {
    try {
        const saltRounds = 10;
        const hash = await bcrypt.hash(req.body.password, saltRounds);
        res.locals.hash = hash;
        next();
    } catch (error) {
        console.error('Error hashing password:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports.comparePassword = async (req, res, next) => {
    try {
        const isMatch = await bcrypt.compare(req.body.password, req.user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        next();
    } catch (error) {
        console.error('Error comparing passwords:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

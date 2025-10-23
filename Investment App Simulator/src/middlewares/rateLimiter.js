const rateLimit = require("express-rate-limit");

// Limit login attempts globally (per IP)
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // each IP can make 10 login requests in 10 mins
  message: {
    status: 429,
    error: "Too many login attempts from this IP. Try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, resetLimiter };

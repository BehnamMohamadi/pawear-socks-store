const rateLimit = require("express-rate-limit");

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "تعداد تلاش‌های ورود بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید.",
  },
});

module.exports = { authRateLimit };

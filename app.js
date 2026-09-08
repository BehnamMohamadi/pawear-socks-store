const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { AppError } = require("./utils/app-error");
const { globalErrorHandler } = require("./controller/error-handler-controller");
const apiRouter = require("./routes/api/api-route");
const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
app.use(require("./middleware/view-context").nonce);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
        "upgrade-insecure-requests": process.env.NODE_ENV === "production" ? [] : null,
      },
    },
  }),
);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));
const origins = (
  process.env.CLIENT_ORIGIN || "http://127.0.0.1:3000,http://localhost:3000"
)
  .split(",")
  .map((s) => s.trim());
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || origins.includes(origin)) return cb(null, true);
      cb(new AppError(403, "مبدأ درخواست مجاز نیست."));
    },
    credentials: true,
  }),
);
app.use((req, res, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("origin");
    if (
      (origin && !origins.includes(origin)) ||
      req.get("sec-fetch-site") === "cross-site"
    )
      return next(new AppError(403, "درخواست از این مبدأ مجاز نیست."));
  }
  next();
});
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(cookieParser());
app.use(
  "/images",
  express.static(path.join(__dirname, "public/images"), { dotfiles: "deny" }),
);
app.use(
  express.static(path.join(__dirname, "public"), { dotfiles: "deny", index: false }),
);
app.get("/health", (req, res) => {
  const connected = require("mongoose").connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ status: connected ? "ok" : "unavailable" });
});
app.use("/api", apiRouter);
app.use("/api", (req, res, next) => next(new AppError(404, "مسیر API پیدا نشد.")));
app.use(require("./routes/view/seo-route"));
app.use(require("./middleware/view-context").viewContext);
app.use(require("./routes/view/admin-route"));
app.use(require("./routes/view/storefront-route"));
app.use((req, res, next) => next(new AppError(404, "مسیر پیدا نشد.")));
app.use(globalErrorHandler);
module.exports = app;
if (require.main === module) require("./server").start();

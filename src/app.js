const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const messageRoutes = require("./routes/message.routes");
const conversationRoutes = require("./routes/conversation.routes");
const uploadRoutes = require("./routes/upload.routes");

const {
  notFound,
  errorHandler,
} = require("./middleware/error.middleware");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

/*
|--------------------------------------------------------------------------
| Paths
|--------------------------------------------------------------------------
*/

const publicPath = path.join(
  __dirname,
  "..",
  "public"
);

const uploadsPath = path.join(
  __dirname,
  "..",
  "uploads"
);

/*
|--------------------------------------------------------------------------
| Security
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

/*
|--------------------------------------------------------------------------
| Body Parsing
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "100mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "100mb",
  })
);

app.use(cookieParser());

/*
|--------------------------------------------------------------------------
| Static Files
|--------------------------------------------------------------------------
*/

app.use(
  express.static(publicPath, {
    index: false,
    fallthrough: true,
    etag: true,
    maxAge: 0,
    setHeaders: function disableFrontendCache(res) {
      if (process.env.NODE_ENV !== "production") {
        res.setHeader("Cache-Control", "no-store");
      }
    },
  })
);

app.use(
  "/uploads",
  express.static(uploadsPath)
);

/*
|--------------------------------------------------------------------------
| Rate Limiting
|--------------------------------------------------------------------------
*/

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Bohat zyada requests bheji gayi hain. Kuch dair baad dobara try karein.",
  },
});

app.use("/api", apiLimiter);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    status: "ok",
    service:
      process.env.APP_NAME ||
      "IDEAZ Messenger",
    environment:
      process.env.NODE_ENV ||
      "development",
    timestamp: new Date().toISOString(),
  });
});

/*
|--------------------------------------------------------------------------
| Frontend Pages
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  return res.sendFile(
    path.join(
      publicPath,
      "login.html"
    )
  );
});

app.get("/login", (req, res) => {
  return res.sendFile(
    path.join(
      publicPath,
      "login.html"
    )
  );
});

app.get("/register", (req, res) => {
  return res.sendFile(
    path.join(
      publicPath,
      "register.html"
    )
  );
});

app.get("/chat", (req, res) => {
  return res.sendFile(
    path.join(
      publicPath,
      "chat.html"
    )
  );
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/messages",
  messageRoutes
);

app.use(
  "/api/conversations",
  conversationRoutes
);

app.use(
  "/api/uploads",
  uploadRoutes
);

/*
|--------------------------------------------------------------------------
| 404 and Error Handler
|--------------------------------------------------------------------------
*/

app.use(notFound);
app.use(errorHandler);

module.exports = app;

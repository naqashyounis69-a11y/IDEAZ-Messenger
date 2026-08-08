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
const remoteRoutes = require("./routes/remote.routes");

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

// Remote desktop frames and input polling are high-frequency by design.
// Its password endpoint has a dedicated strict limiter in the router.
app.use("/api/remote", remoteRoutes);
app.use("/api", apiLimiter);

// WebRTC network configuration. TURN credentials stay on the server and are
// only exposed to signed-in app clients through this small runtime config.
app.get("/api/rtc-config", (req, res) => {
  const iceServers = [
    { urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
      "stun:stun.cloudflare.com:3478",
    ] },
  ];

  const turnUrls = String(process.env.TURN_URLS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (turnUrls.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    iceServers.push({
      urls: turnUrls,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }

  res.setHeader("Cache-Control", "no-store");
  return res.json({ iceServers, hasTurn: iceServers.length > 1 });
});

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

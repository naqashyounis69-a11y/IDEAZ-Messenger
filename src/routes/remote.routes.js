const express = require("express");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const router = express.Router();
const sessions = new Map();
const SESSION_TTL = 30 * 60 * 1000;
const connectLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Bohat zyada attempts. 10 minute baad try karein." },
});

const token = () => crypto.randomBytes(32).toString("base64url");
const digest = (value, salt) => crypto.scryptSync(String(value), salt, 32).toString("hex");
const safeEqual = (left, right) => {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

function getSession(req, credentialName) {
  const session = sessions.get(String(req.params.id || req.body?.sessionId || ""));
  const supplied = String(req.headers["x-remote-token"] || "");
  if (!session || !supplied || !safeEqual(session[credentialName], supplied)) return null;
  session.updatedAt = Date.now();
  return session;
}

router.post("/sessions", (req, res) => {
  const sessionId = String(req.body?.sessionId || "").replace(/\D/g, "");
  const password = String(req.body?.password || "");
  if (sessionId.length !== 9 || password.length < 8) {
    return res.status(400).json({ message: "Invalid session details." });
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const hostToken = token();
  sessions.set(sessionId, {
    id: sessionId,
    salt,
    passwordHash: digest(password, salt),
    hostToken,
    controllerToken: null,
    state: "ready",
    frame: null,
    frameVersion: 0,
    inputs: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return res.status(201).json({ hostToken, expiresIn: SESSION_TTL / 1000 });
});

router.post("/connect", connectLimiter, (req, res) => {
  const sessionId = String(req.body?.sessionId || "").replace(/\D/g, "");
  const password = String(req.body?.password || "");
  const session = sessions.get(sessionId);
  if (!session || Date.now() - session.updatedAt > SESSION_TTL ||
      !safeEqual(session.passwordHash, digest(password, session.salt))) {
    return res.status(401).json({ message: "ID ya password ghalat/expired hai." });
  }
  if (session.state !== "ready") return res.status(409).json({ message: "Session busy hai." });
  session.controllerToken = token();
  session.state = "pending";
  session.updatedAt = Date.now();
  return res.json({ controllerToken: session.controllerToken, state: session.state });
});

router.get("/sessions/:id/status", (req, res) => {
  const host = getSession(req, "hostToken");
  if (host) return res.json({ state: host.state });
  const controller = getSession(req, "controllerToken");
  if (controller) return res.json({ state: controller.state });
  return res.status(401).json({ message: "Session expired." });
});

router.post("/sessions/:id/decision", (req, res) => {
  const session = getSession(req, "hostToken");
  if (!session || session.state !== "pending") return res.status(401).json({ message: "Invalid request." });
  session.state = req.body?.allow === true ? "active" : "rejected";
  if (session.state === "rejected") session.controllerToken = null;
  return res.json({ state: session.state });
});

router.post("/sessions/:id/frame", (req, res) => {
  const session = getSession(req, "hostToken");
  const frame = String(req.body?.frame || "");
  if (!session || session.state !== "active") return res.status(401).end();
  if (!frame.startsWith("data:image/jpeg;base64,") || frame.length > 1_500_000) return res.status(413).end();
  session.frame = frame;
  session.frameVersion += 1;
  return res.json({ version: session.frameVersion });
});

router.get("/sessions/:id/frame", (req, res) => {
  const session = getSession(req, "controllerToken");
  if (!session || session.state !== "active") return res.status(401).end();
  return res.json({ frame: session.frame, version: session.frameVersion });
});

router.post("/sessions/:id/input", (req, res) => {
  const session = getSession(req, "controllerToken");
  if (!session || session.state !== "active") return res.status(401).end();
  const event = req.body?.event || {};
  if (!['move', 'click', 'key'].includes(event.type)) return res.status(400).end();
  session.inputs.push(event);
  if (session.inputs.length > 100) session.inputs.splice(0, session.inputs.length - 100);
  return res.status(202).end();
});

router.get("/sessions/:id/input", (req, res) => {
  const session = getSession(req, "hostToken");
  if (!session || session.state !== "active") return res.status(401).end();
  return res.json({ events: session.inputs.splice(0, 50) });
});

router.post("/sessions/:id/end", (req, res) => {
  const session = getSession(req, "hostToken") || getSession(req, "controllerToken");
  if (!session) return res.status(401).end();
  session.state = "ended";
  session.frame = null;
  session.inputs = [];
  return res.status(204).end();
});

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.updatedAt > SESSION_TTL) sessions.delete(id);
  }
}, 60_000).unref();

module.exports = router;

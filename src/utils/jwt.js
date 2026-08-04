const jwt = require("jsonwebtoken");

function getJwtSecret() {
  const secret =
    process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_ACCESS_SECRET ya JWT_SECRET .env mein configured nahi hai."
    );
  }

  return secret;
}

function getJwtExpiry() {
  return (
    process.env.JWT_ACCESS_EXPIRES_IN ||
    process.env.JWT_EXPIRES_IN ||
    "30d"
  );
}

function generateAccessToken(user) {
  if (!user || !user.id) {
    throw new Error("JWT generate karne ke liye valid user required hai.");
  }

  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      type: "access",
    },
    getJwtSecret(),
    {
      expiresIn: getJwtExpiry(),
      issuer: process.env.APP_NAME || "IDEAZ Messenger",
      audience: "ideaz-messenger-users",
    }
  );
}

function verifyAccessToken(token) {
  if (!token || typeof token !== "string") {
    throw new Error("Access token required hai.");
  }

  return jwt.verify(token, getJwtSecret(), {
    issuer: process.env.APP_NAME || "IDEAZ Messenger",
    audience: "ideaz-messenger-users",
  });
}

function decodeToken(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  return jwt.decode(token);
}

function extractBearerToken(authorizationHeader) {
  if (
    !authorizationHeader ||
    typeof authorizationHeader !== "string"
  ) {
    return null;
  }

  const parts = authorizationHeader.trim().split(/\s+/);

  if (
    parts.length !== 2 ||
    parts[0].toLowerCase() !== "bearer"
  ) {
    return null;
  }

  return parts[1];
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  decodeToken,
  extractBearerToken,
};
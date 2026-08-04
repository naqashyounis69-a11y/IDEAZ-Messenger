const prisma = require("../config/prisma");
const {
  verifyAccessToken,
  extractBearerToken,
} = require("../utils/jwt");

async function protect(req, res, next) {
  try {
    const token = extractBearerToken(
      req.headers.authorization
    );

    if (!token) {
      return res.status(401).json({
        success: false,
        message:
          "Access denied. Authorization Bearer token required hai.",
      });
    }

    let decoded;

    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message:
            "Access token expire ho chuka hai. Dobara login karein.",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Access token invalid hai.",
      });
    }

    if (
      !decoded ||
      !decoded.sub ||
      decoded.type !== "access"
    ) {
      return res.status(401).json({
        success: false,
        message: "Access token invalid hai.",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.sub,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        avatar: true,
        about: true,
        online: true,
        lastSeen: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Is token se related user mojood nahi hai.",
      });
    }

    req.user = user;
    req.token = token;

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  protect,
};
const authService = require("../services/auth.service");

function sendSuccess(res, statusCode, message, data = null) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

async function register(req, res, next) {
  try {
    const result = await authService.registerUser(req.body);

    return sendSuccess(
      res,
      201,
      "Account successfully create ho gaya hai.",
      result
    );
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.loginWithPassword(req.body);

    return sendSuccess(
      res,
      200,
      "Login successful hai.",
      result
    );
  } catch (error) {
    return next(error);
  }
}

async function pinLogin(req, res, next) {
  try {
    const result = await authService.loginWithPin(req.body);

    return sendSuccess(
      res,
      200,
      "PIN login successful hai.",
      result
    );
  } catch (error) {
    return next(error);
  }
}

async function profile(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);

    return sendSuccess(
      res,
      200,
      "Profile successfully load ho gayi hai.",
      {
        user,
      }
    );
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    const result = await authService.logoutUser(req.user.id);

    const io = req.app.get("io");

    if (io) {
      io.emit("user-offline", {
        userId: req.user.id,
        online: false,
        lastSeen: result.lastSeen,
      });
    }

    return sendSuccess(
      res,
      200,
      "Logout successful hai.",
      result
    );
  } catch (error) {
    return next(error);
  }
}

async function checkUsername(req, res, next) {
  try {
    const result =
      await authService.checkUsernameAvailability(
        req.params.username
      );

    return sendSuccess(
      res,
      200,
      result.available
        ? "Username available hai."
        : "Username pehle se registered hai.",
      result
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  pinLogin,
  profile,
  logout,
  checkUsername,
};
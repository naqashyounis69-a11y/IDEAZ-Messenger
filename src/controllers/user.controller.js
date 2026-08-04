const userService = require("../services/user.service");

function sendSuccess(
  res,
  statusCode,
  message,
  data = null
) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

async function searchUsers(
  req,
  res,
  next
) {
  try {
    const query =
      req.query.q ||
      req.query.query ||
      "";

    const limit =
      req.query.limit ||
      20;

    const users =
      await userService.searchUsers({
        currentUserId:
          req.user.id,

        query,

        limit,
      });

    return sendSuccess(
      res,
      200,
      users.length > 0
        ? "Users successfully mil gaye."
        : "Koi matching user nahi mila.",
      {
        users,
        count: users.length,
      }
    );
  } catch (error) {
    return next(error);
  }
}

async function getUserById(
  req,
  res,
  next
) {
  try {
    const user =
      await userService.getUserById({
        currentUserId:
          req.user.id,

        userId:
          req.params.userId,
      });

    return sendSuccess(
      res,
      200,
      "User profile successfully load ho gayi.",
      {
        user,
      }
    );
  } catch (error) {
    return next(error);
  }
}

async function getAllUsers(
  req,
  res,
  next
) {
  try {
    const limit =
      req.query.limit ||
      50;

    const users =
      await userService.getAllUsers({
        currentUserId:
          req.user.id,

        limit,
      });

    return sendSuccess(
      res,
      200,
      users.length > 0
        ? "Users successfully load ho gaye."
        : "Koi doosra user available nahi hai.",
      {
        users,
        count: users.length,
      }
    );
  } catch (error) {
    return next(error);
  }
}

async function updatePresence(
  req,
  res,
  next
) {
  try {
    const online =
      req.body.online;

    if (
      typeof online !==
      "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Online field true ya false honi chahiye.",
      });
    }

    const user =
      await userService.updateUserPresence({
        userId:
          req.user.id,

        online,
      });

    const io =
      req.app.get("io");

    if (io) {
      io.emit(
        online
          ? "user-online"
          : "user-offline",
        {
          userId:
            user.id,

          online:
            user.online,

          lastSeen:
            user.lastSeen,
        }
      );
    }

    return sendSuccess(
      res,
      200,
      online
        ? "User online ho gaya."
        : "User offline ho gaya.",
      {
        user,
      }
    );
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  searchUsers,
  getUserById,
  getAllUsers,
  updatePresence,
};
const prisma = require("../config/prisma");

function normalizeSearchQuery(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    avatar: user.avatar,
    about: user.about,
    online: user.online,
    lastSeen: user.lastSeen,
    createdAt: user.createdAt,
  };
}

async function searchUsers({
  currentUserId,
  query,
  limit = 20,
}) {
  const normalizedQuery =
    normalizeSearchQuery(query);

  if (!currentUserId) {
    throw {
      statusCode: 401,
      message:
        "Current logged-in user required hai.",
    };
  }

  if (normalizedQuery.length < 2) {
    throw {
      statusCode: 400,
      message:
        "Search ke liye kam az kam 2 characters enter karein.",
    };
  }

  const normalizedLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    50
  );

  const users = await prisma.user.findMany({
    where: {
      id: {
        not: currentUserId,
      },

      OR: [
        {
          username: {
            contains: normalizedQuery,
            mode: "insensitive",
          },
        },

        {
          fullName: {
            contains: normalizedQuery,
            mode: "insensitive",
          },
        },
      ],
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

    orderBy: [
      {
        online: "desc",
      },
      {
        fullName: "asc",
      },
    ],

    take: normalizedLimit,
  });

  return users.map(sanitizeUser);
}

async function getUserById({
  currentUserId,
  userId,
}) {
  if (!currentUserId) {
    throw {
      statusCode: 401,
      message:
        "Current logged-in user required hai.",
    };
  }

  if (!userId) {
    throw {
      statusCode: 400,
      message: "User ID required hai.",
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
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
    throw {
      statusCode: 404,
      message: "User nahi mila.",
    };
  }

  return sanitizeUser(user);
}

async function getAllUsers({
  currentUserId,
  limit = 50,
}) {
  if (!currentUserId) {
    throw {
      statusCode: 401,
      message:
        "Current logged-in user required hai.",
    };
  }

  const normalizedLimit = Math.min(
    Math.max(Number(limit) || 50, 1),
    100
  );

  const users = await prisma.user.findMany({
    where: {
      id: {
        not: currentUserId,
      },
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

    orderBy: [
      {
        online: "desc",
      },
      {
        fullName: "asc",
      },
    ],

    take: normalizedLimit,
  });

  return users.map(sanitizeUser);
}

async function updateUserPresence({
  userId,
  online,
}) {
  if (!userId) {
    throw {
      statusCode: 400,
      message: "User ID required hai.",
    };
  }

  const data = {
    online: Boolean(online),
    lastSeen: new Date(),
  };

  const user = await prisma.user.update({
    where: {
      id: userId,
    },

    data,

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

  return sanitizeUser(user);
}

module.exports = {
  searchUsers,
  getUserById,
  getAllUsers,
  updateUserPresence,
  sanitizeUser,
};
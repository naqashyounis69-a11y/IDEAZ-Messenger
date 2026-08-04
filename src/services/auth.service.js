const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const {
  generateAccessToken,
} = require("../utils/jwt");

function normalizeUsername(username) {
  return String(username || "")
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

function validateUsername(username) {
  if (!username) {
    throw {
      statusCode: 400,
      message: "Username required hai.",
    };
  }

  if (username.length < 3) {
    throw {
      statusCode: 400,
      message: "Username kam az kam 3 characters ka hona chahiye.",
    };
  }

  if (username.length > 30) {
    throw {
      statusCode: 400,
      message: "Username 30 characters se zyada nahi ho sakta.",
    };
  }

  const usernamePattern = /^[a-z0-9._]+$/;

  if (!usernamePattern.test(username)) {
    throw {
      statusCode: 400,
      message:
        "Username mein sirf small letters, numbers, dot aur underscore allowed hain.",
    };
  }
}

function validateFullName(fullName) {
  const normalizedFullName = String(fullName || "").trim();

  if (!normalizedFullName) {
    throw {
      statusCode: 400,
      message: "Full name required hai.",
    };
  }

  if (normalizedFullName.length < 2) {
    throw {
      statusCode: 400,
      message: "Full name kam az kam 2 characters ka hona chahiye.",
    };
  }

  if (normalizedFullName.length > 100) {
    throw {
      statusCode: 400,
      message: "Full name 100 characters se zyada nahi ho sakta.",
    };
  }

  return normalizedFullName;
}

function validatePassword(password) {
  if (!password) {
    throw {
      statusCode: 400,
      message: "Password required hai.",
    };
  }

  if (String(password).length < 6) {
    throw {
      statusCode: 400,
      message: "Password kam az kam 6 characters ka hona chahiye.",
    };
  }

  if (String(password).length > 128) {
    throw {
      statusCode: 400,
      message: "Password bohat zyada lamba hai.",
    };
  }
}

function validatePin(pin) {
  const normalizedPin = String(pin || "").trim();

  if (!/^\d{4,6}$/.test(normalizedPin)) {
    throw {
      statusCode: 400,
      message: "PIN sirf 4 se 6 digits ka hona chahiye.",
    };
  }

  return normalizedPin;
}

async function registerUser(payload) {
  const username = normalizeUsername(payload.username);
  const fullName = validateFullName(payload.fullName);
  const password = String(payload.password || "");
  const pin = validatePin(payload.pin);

  validateUsername(username);
  validatePassword(password);

  const existingUser = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (existingUser) {
    throw {
      statusCode: 409,
      message: "Yeh username pehle se registered hai.",
    };
  }

  const bcryptRounds = Number(
    process.env.BCRYPT_ROUNDS || 12
  );

  const hashedPassword = await bcrypt.hash(
    password,
    bcryptRounds
  );

  const hashedPin = await bcrypt.hash(
    pin,
    bcryptRounds
  );

  const user = await prisma.user.create({
    data: {
      username,
      fullName,
      password: hashedPassword,
      pin: hashedPin,
      avatar: payload.avatar
        ? String(payload.avatar).trim()
        : null,
      about:
        String(payload.about || "").trim() ||
        process.env.DEFAULT_ABOUT ||
        "Hey! I am using IDEAZ Messenger",
      online: false,
      lastSeen: new Date(),
    },
  });

  const accessToken = generateAccessToken(user);

  return {
    user: sanitizeUser(user),
    accessToken,
  };
}

async function loginWithPassword(payload) {
  const username = normalizeUsername(payload.username);
  const password = String(payload.password || "");

  if (!username || !password) {
    throw {
      statusCode: 400,
      message: "Username aur password required hain.",
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (!user) {
    throw {
      statusCode: 401,
      message: "Username ya password ghalat hai.",
    };
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.password
  );

  if (!passwordMatches) {
    throw {
      statusCode: 401,
      message: "Username ya password ghalat hai.",
    };
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      online: true,
      lastSeen: new Date(),
    },
  });

  const accessToken = generateAccessToken(updatedUser);

  return {
    user: sanitizeUser(updatedUser),
    accessToken,
  };
}

async function loginWithPin(payload) {
  const username = normalizeUsername(payload.username);
  const pin = String(payload.pin || "").trim();

  if (!username || !pin) {
    throw {
      statusCode: 400,
      message: "Username aur PIN required hain.",
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (!user) {
    throw {
      statusCode: 401,
      message: "Username ya PIN ghalat hai.",
    };
  }

  const pinMatches = await bcrypt.compare(
    pin,
    user.pin
  );

  if (!pinMatches) {
    throw {
      statusCode: 401,
      message: "Username ya PIN ghalat hai.",
    };
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      online: true,
      lastSeen: new Date(),
    },
  });

  const accessToken = generateAccessToken(updatedUser);

  return {
    user: sanitizeUser(updatedUser),
    accessToken,
  };
}

async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
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

async function logoutUser(userId) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw {
      statusCode: 404,
      message: "User nahi mila.",
    };
  }

  const lastSeen = new Date();

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      online: false,
      lastSeen,
    },
  });

  return {
    lastSeen,
  };
}

async function checkUsernameAvailability(usernameValue) {
  const username = normalizeUsername(usernameValue);

  validateUsername(username);

  const existingUser = await prisma.user.findUnique({
    where: {
      username,
    },
    select: {
      id: true,
    },
  });

  return {
    username,
    available: !existingUser,
  };
}

module.exports = {
  registerUser,
  loginWithPassword,
  loginWithPin,
  getCurrentUser,
  logoutUser,
  checkUsernameAvailability,
  sanitizeUser,
};
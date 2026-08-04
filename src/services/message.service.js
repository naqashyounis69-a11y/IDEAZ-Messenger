const prisma = require("../config/prisma");

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function cleanUser(user) {
  if (!user) return null;

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

function cleanMessage(message) {
  if (!message) return null;

  return {
    id: message.id,
    senderId: message.senderId,
    receiverId: message.receiverId,
    text: message.text,
    file: message.file,
    fileType: message.fileType,
    seen: message.seen,
    createdAt: message.createdAt,
    sender: cleanUser(message.sender),
    receiver: cleanUser(message.receiver),
  };
}

async function hydrateMessagesWithUsers(messages) {
  const uniqueUserIds = [
    ...new Set(
      messages.flatMap((message) => [
        message.senderId,
        message.receiverId,
      ])
    ),
  ];

  if (uniqueUserIds.length === 0) {
    return messages.map((message) => ({
      ...message,
      sender: null,
      receiver: null,
    }));
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: uniqueUserIds,
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
  });

  const userMap = new Map(
    users.map((user) => [user.id, user])
  );

  return messages.map((message) => ({
    ...message,
    sender: userMap.get(message.senderId) || null,
    receiver: userMap.get(message.receiverId) || null,
  }));
}

async function ensureUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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
    throw createError(404, "User nahi mila.");
  }

  return user;
}

async function sendMessage({
  senderId,
  receiverId,
  text,
  file = null,
  fileType = null,
}) {
  if (!senderId || !receiverId) {
    throw createError(
      400,
      "Sender aur receiver required hain."
    );
  }

  if (senderId === receiverId) {
    throw createError(
      400,
      "Apne aap ko message send nahi kar sakte."
    );
  }

  const normalizedText = String(text || "").trim();
  const normalizedFile = file ? String(file).trim() : null;
  const normalizedFileType = fileType
    ? String(fileType).trim()
    : null;

  if (!normalizedText && !normalizedFile) {
    throw createError(
      400,
      "Message text ya file required hai."
    );
  }

  if (normalizedText.length > 5000) {
    throw createError(
      400,
      "Message 5000 characters se zyada nahi ho sakta."
    );
  }

  await ensureUser(senderId);
  await ensureUser(receiverId);

  const message = await prisma.message.create({
    data: {
      senderId,
      receiverId,
      text: normalizedText || null,
      file: normalizedFile,
      fileType: normalizedFileType,
      seen: false,
    },
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      text: true,
      file: true,
      fileType: true,
      seen: true,
      createdAt: true,
    },
  });

  const [hydratedMessage] = await hydrateMessagesWithUsers([
    message,
  ]);

  return cleanMessage(hydratedMessage);
}

async function getMessagesWithUser({
  currentUserId,
  otherUserId,
  limit = 100,
  before = null,
}) {
  if (!currentUserId || !otherUserId) {
    throw createError(
      400,
      "Current user aur other user required hain."
    );
  }

  await ensureUser(otherUserId);

  const take = Math.min(
    Math.max(Number(limit) || 100, 1),
    200
  );

  const where = {
    OR: [
      {
        senderId: currentUserId,
        receiverId: otherUserId,
      },
      {
        senderId: otherUserId,
        receiverId: currentUserId,
      },
    ],
  };

  if (before) {
    const beforeDate = new Date(before);

    if (!Number.isNaN(beforeDate.getTime())) {
      where.createdAt = {
        lt: beforeDate,
      };
    }
  }

  const messages = await prisma.message.findMany({
    where,
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      text: true,
      file: true,
      fileType: true,
      seen: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take,
  });

  const hydratedMessages = await hydrateMessagesWithUsers(
    messages
  );

  return hydratedMessages
    .reverse()
    .map(cleanMessage);
}

async function markMessageSeen({
  messageId,
  currentUserId,
}) {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!message) {
    throw createError(404, "Message nahi mila.");
  }

  if (message.receiverId !== currentUserId) {
    throw createError(
      403,
      "Aap is message ko seen mark nahi kar sakte."
    );
  }

  const updated = await prisma.message.update({
    where: {
      id: messageId,
    },
    data: {
      seen: true,
    },
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      text: true,
      file: true,
      fileType: true,
      seen: true,
      createdAt: true,
    },
  });

  const [hydratedMessage] = await hydrateMessagesWithUsers([
    updated,
  ]);

  return cleanMessage(hydratedMessage);
}

async function markConversationSeen({
  currentUserId,
  otherUserId,
}) {
  await ensureUser(otherUserId);

  const result = await prisma.message.updateMany({
    where: {
      senderId: otherUserId,
      receiverId: currentUserId,
      seen: false,
    },
    data: {
      seen: true,
    },
  });

  return {
    updatedCount: result.count,
  };
}

async function deleteMessage({
  messageId,
  currentUserId,
}) {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!message) {
    throw createError(404, "Message nahi mila.");
  }

  const allowed =
    message.senderId === currentUserId ||
    message.receiverId === currentUserId;

  if (!allowed) {
    throw createError(
      403,
      "Aap is message ko delete nahi kar sakte."
    );
  }

  await prisma.message.delete({
    where: {
      id: messageId,
    },
  });

  return {
    id: messageId,
  };
}

async function deleteMessageForEveryone({
  messageId,
  currentUserId,
}) {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });

  if (!message) {
    throw createError(404, "Message nahi mila.");
  }

  if (message.senderId !== currentUserId) {
    throw createError(
      403,
      "Sirf sender message sab ke liye delete kar sakta hai."
    );
  }

  await prisma.message.delete({
    where: {
      id: messageId,
    },
  });

  return {
    id: messageId,
    receiverId: message.receiverId,
  };
}

async function createDirectConversation({
  currentUserId,
  otherUserId,
}) {
  if (!currentUserId || !otherUserId) {
    throw createError(400, "Current user aur other user required hain.");
  }

  if (currentUserId === otherUserId) {
    throw createError(400, "Apne aap ke saath conversation nahi bana sakte.");
  }

  const currentUser = await ensureUser(currentUserId);
  const otherUser = await ensureUser(otherUserId);

  const conversationId = [currentUserId, otherUserId]
    .sort()
    .join("__");

  return {
    id: conversationId,
    type: "DIRECT",
    name: otherUser.fullName || otherUser.username,
    image: otherUser.avatar || null,
    otherUser: cleanUser(otherUser),
    user: cleanUser(otherUser),
    lastMessage: null,
    unreadCount: 0,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    currentUser: cleanUser(currentUser),
  };
}

async function getConversationSummaries({
  currentUserId,
}) {
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: currentUserId },
        { receiverId: currentUserId },
      ],
    },
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      text: true,
      file: true,
      fileType: true,
      seen: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const map = new Map();

  const hydratedMessages = await hydrateMessagesWithUsers(
    messages
  );

  for (const message of hydratedMessages) {
    const otherUser =
      message.senderId === currentUserId
        ? message.receiver
        : message.sender;

    if (!otherUser || map.has(otherUser.id)) {
      continue;
    }

    const unreadCount = await prisma.message.count({
      where: {
        senderId: otherUser.id,
        receiverId: currentUserId,
        seen: false,
      },
    });

    map.set(otherUser.id, {
      id: [currentUserId, otherUser.id]
        .sort()
        .join("__"),
      type: "DIRECT",
      otherUser: cleanUser(otherUser),
      lastMessage: cleanMessage(message),
      unreadCount,
      updatedAt: message.createdAt,
    });
  }

  return Array.from(map.values());
}

module.exports = {
  sendMessage,
  getMessagesWithUser,
  markMessageSeen,
  markConversationSeen,
  deleteMessage,
  deleteMessageForEveryone,
  createDirectConversation,
  getConversationSummaries,
};
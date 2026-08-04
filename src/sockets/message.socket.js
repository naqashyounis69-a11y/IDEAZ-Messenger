const socketService = require("../services/socket.service");

function emitToUser(io, userId, eventName, payload) {
  if (!io || !userId) {
    return;
  }

  io.to(`user:${userId}`).emit(eventName, payload);
}

function registerMessageSocket(io, socket) {
  socket.on("message:send", (payload = {}, acknowledge) => {
    try {
      const {
        receiverId,
        message,
      } = payload;

      if (!receiverId || !message) {
        const errorResponse = {
          success: false,
          message:
            "Receiver ID aur message required hain.",
        };

        if (typeof acknowledge === "function") {
          acknowledge(errorResponse);
        }

        return;
      }

      const senderId = socket.userId;

      const messagePayload = {
        ...message,
        senderId:
          message.senderId || senderId,
        receiverId,
        createdAt:
          message.createdAt ||
          new Date().toISOString(),
      };

      emitToUser(io, receiverId, "new-message", messagePayload);

      if (senderId) {
        emitToUser(io, senderId, "new-message", messagePayload);
      }

      if (typeof acknowledge === "function") {
        acknowledge({
          success: true,
          message:
            "Message realtime send ho gaya.",
          data: {
            message: messagePayload,
          },
        });
      }
    } catch (error) {
      console.error(
        "message:send socket error:",
        error
      );

      if (typeof acknowledge === "function") {
        acknowledge({
          success: false,
          message:
            "Realtime message send nahi ho saka.",
        });
      }
    }
  });

  socket.on("new-message", (payload = {}) => {
    const message = payload?.message || payload;

    if (!message || !message.receiverId) {
      return;
    }

    emitToUser(io, message.receiverId, "new-message", payload);
  });

  socket.on(
    "message-delivered",
    (payload = {}) => {
      const {
        messageId,
        senderId,
        receiverId,
      } = payload;

      if (!messageId || !senderId) {
        return;
      }

      emitToUser(io, senderId, "message-delivered", {
        messageId,
        senderId,
        receiverId:
          receiverId || socket.userId,
        deliveredAt:
          new Date().toISOString(),
      });
    }
  );

  socket.on(
    "message-seen",
    (payload = {}) => {
      const {
        messageId,
        senderId,
        receiverId,
      } = payload;

      if (!messageId || !senderId) {
        return;
      }

      emitToUser(io, senderId, "message-seen", {
        messageId,
        senderId,
        receiverId:
          receiverId || socket.userId,
        seenAt:
          new Date().toISOString(),
      });
    }
  );

  socket.on(
    "typing-start",
    (payload = {}) => {
      const {
        receiverId,
        conversationId,
        userId,
      } = payload;

      if (!receiverId) {
        return;
      }

      emitToUser(io, receiverId, "typing-start", {
        userId: userId || socket.userId,
        conversationId:
          conversationId || null,
      });
    }
  );

  socket.on(
    "typing-stop",
    (payload = {}) => {
      const {
        receiverId,
        conversationId,
        userId,
      } = payload;

      if (!receiverId) {
        return;
      }

      emitToUser(io, receiverId, "typing-stop", {
        userId: userId || socket.userId,
        conversationId:
          conversationId || null,
      });
    }
  );

  socket.on(
    "message:delete",
    (payload = {}) => {
      const {
        messageId,
        receiverId,
      } = payload;

      if (!messageId || !receiverId) {
        return;
      }

      emitToUser(io, receiverId, "message-deleted", {
        messageId,
        deletedBy:
          socket.userId,
        deletedAt:
          new Date().toISOString(),
      });
    }
  );
}

module.exports = {
  registerMessageSocket,
};
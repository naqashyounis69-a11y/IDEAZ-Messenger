const messageService = require(
  "../services/message.service"
);

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

function getIo(req) {
  return req.app.get("io");
}

function emitToUser(
  io,
  userId,
  eventName,
  payload
) {
  if (!io || !userId) {
    return;
  }

  io.to(`user:${userId}`).emit(
    eventName,
    payload
  );
}

function getConversationId(
  firstUserId,
  secondUserId
) {
  return [
    firstUserId,
    secondUserId,
  ]
    .sort()
    .join("__");
}

async function sendMessage(
  req,
  res,
  next
) {
  try {
    const message =
      await messageService.sendMessage({
        senderId: req.user.id,
        receiverId:
          req.body.receiverId,
        text:
          req.body.text,
        file:
          req.body.file || null,
        fileType:
          req.body.fileType || null,
      });

    const io = getIo(req);

    const conversationId =
      getConversationId(
        message.senderId,
        message.receiverId
      );

    emitToUser(
      io,
      message.receiverId,
      "new-message",
      {
        conversationId,
        message: {
          ...message,
          conversationId,
        },
        sender:
          message.sender || null,
      }
    );

    return sendSuccess(
      res,
      201,
      "Message successfully send ho gaya.",
      {
        message: {
          ...message,
          conversationId,
        },
      }
    );
  } catch (error) {
    return next(error);
  }
}

async function getMessagesWithUser(
  req,
  res,
  next
) {
  try {
    const messages =
      await messageService.getMessagesWithUser({
        currentUserId:
          req.user.id,

        otherUserId:
          req.params.userId,

        limit:
          req.query.limit,

        before:
          req.query.before,
      });

    const conversationId =
      getConversationId(
        req.user.id,
        req.params.userId
      );

    return sendSuccess(
      res,
      200,
      messages.length > 0
        ? "Messages successfully load ho gaye."
        : "Abhi koi message nahi hai.",
      {
        conversationId,
        messages: messages.map(
          function addConversationId(message) {
            return {
              ...message,
              conversationId,
            };
          }
        ),
        count:
          messages.length,
      }
    );
  } catch (error) {
    return next(error);
  }
}

async function markMessageSeen(
  req,
  res,
  next
) {
  try {
    const message =
      await messageService.markMessageSeen({
        messageId:
          req.params.messageId,

        currentUserId:
          req.user.id,
      });

    const conversationId =
      getConversationId(
        message.senderId,
        message.receiverId
      );

    const io = getIo(req);

    emitToUser(
      io,
      message.senderId,
      "message-seen",
      {
        messageId:
          message.id,
        conversationId,
        seenBy:
          req.user.id,
        seenAt:
          new Date().toISOString(),
      }
    );

    return sendSuccess(
      res,
      200,
      "Message seen mark ho gaya.",
      {
        message: {
          ...message,
          conversationId,
        },
      }
    );
  } catch (error) {
    return next(error);
  }
}

async function markConversationSeen(
  req,
  res,
  next
) {
  try {
    const result =
      await messageService.markConversationSeen({
        currentUserId:
          req.user.id,

        otherUserId:
          req.params.userId,
      });

    const conversationId =
      getConversationId(
        req.user.id,
        req.params.userId
      );

    const io = getIo(req);

    emitToUser(
      io,
      req.params.userId,
      "conversation-seen",
      {
        conversationId,
        seenBy:
          req.user.id,
        updatedCount:
          result.updatedCount,
        seenAt:
          new Date().toISOString(),
      }
    );

    return sendSuccess(
      res,
      200,
      "Conversation messages seen mark ho gaye.",
      {
        conversationId,
        updatedCount:
          result.updatedCount,
      }
    );
  } catch (error) {
    return next(error);
  }
}

async function deleteMessage(
  req,
  res,
  next
) {
  try {
    const result =
      await messageService.deleteMessage({
        messageId:
          req.params.messageId,

        currentUserId:
          req.user.id,
      });

    return sendSuccess(
      res,
      200,
      "Message delete ho gaya.",
      result
    );
  } catch (error) {
    return next(error);
  }
}

async function deleteMessageForEveryone(
  req,
  res,
  next
) {
  try {
    const result =
      await messageService.deleteMessageForEveryone({
        messageId:
          req.params.messageId,

        currentUserId:
          req.user.id,
      });

    const io = getIo(req);

    emitToUser(
      io,
      result.receiverId,
      "message-deleted",
      {
        messageId:
          result.id,
        deletedForEveryone:
          true,
      }
    );

    return sendSuccess(
      res,
      200,
      "Message sab ke liye delete ho gaya.",
      {
        messageId:
          result.id,
      }
    );
  } catch (error) {
    return next(error);
  }
}

async function createDirectConversation(
  req,
  res,
  next
) {
  try {
    const conversation =
      await messageService.createDirectConversation({
        currentUserId:
          req.user.id,
        otherUserId:
          req.body.userId,
      });

    return sendSuccess(
      res,
      200,
      "Conversation ready ho gayi hai.",
      {
        conversation,
      }
    );
  } catch (error) {
    return next(error);
  }
}

async function getConversationSummaries(
  req,
  res,
  next
) {
  try {
    const conversations =
      await messageService.getConversationSummaries({
        currentUserId:
          req.user.id,
      });

    return sendSuccess(
      res,
      200,
      conversations.length > 0
        ? "Conversations successfully load ho gayi hain."
        : "Abhi koi conversation nahi hai.",
      {
        conversations,
        count:
          conversations.length,
      }
    );
  } catch (error) {
    return next(error);
  }
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
const express = require("express");

const messageController = require(
  "../controllers/message.controller"
);

const {
  protect,
} = require(
  "../middleware/auth.middleware"
);

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Protected Routes
|--------------------------------------------------------------------------
*/

router.use(protect);

/*
|--------------------------------------------------------------------------
| Conversation Summary
|--------------------------------------------------------------------------
|
| GET /api/messages/conversations
|
*/

router.get(
  "/conversations",
  messageController.getConversationSummaries
);

/*
|--------------------------------------------------------------------------
| Send Message
|--------------------------------------------------------------------------
|
| POST /api/messages
|
| Body:
| {
|   "receiverId": "USER_ID",
|   "text": "Hello"
| }
|
*/

router.post(
  "/",
  messageController.sendMessage
);

/*
|--------------------------------------------------------------------------
| Get Messages With User
|--------------------------------------------------------------------------
|
| GET /api/messages/user/:userId
|
*/

router.get(
  "/user/:userId",
  messageController.getMessagesWithUser
);

/*
|--------------------------------------------------------------------------
| Mark Whole Conversation Seen
|--------------------------------------------------------------------------
|
| PATCH /api/messages/user/:userId/seen
|
*/

router.patch(
  "/user/:userId/seen",
  messageController.markConversationSeen
);

/*
|--------------------------------------------------------------------------
| Mark Single Message Seen
|--------------------------------------------------------------------------
|
| PATCH /api/messages/:messageId/seen
|
*/

router.patch(
  "/:messageId/seen",
  messageController.markMessageSeen
);

/*
|--------------------------------------------------------------------------
| Delete Message For Everyone
|--------------------------------------------------------------------------
|
| DELETE /api/messages/:messageId/everyone
|
*/

router.delete(
  "/:messageId/everyone",
  messageController.deleteMessageForEveryone
);

/*
|--------------------------------------------------------------------------
| Delete Message
|--------------------------------------------------------------------------
|
| DELETE /api/messages/:messageId
|
*/

router.delete(
  "/:messageId",
  messageController.deleteMessage
);

module.exports = router;
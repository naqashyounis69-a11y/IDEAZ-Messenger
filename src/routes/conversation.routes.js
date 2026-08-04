const express = require("express");

const messageController = require("../controllers/message.controller");

const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(protect);

router.get("/", messageController.getConversationSummaries);
router.post("/direct", messageController.createDirectConversation);

module.exports = router;

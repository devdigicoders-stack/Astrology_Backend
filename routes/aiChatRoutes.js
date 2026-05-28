const express = require("express");
const router = express.Router();
const aiChatController = require("../controllers/aiChatController");
const { protectUser } = require("../middleware/authMiddleware");

// Route to send message to AI Astrologer
router.post("/send", protectUser, aiChatController.chatWithAI);

// Route to get AI chat history (all or specific session)
router.get("/history", protectUser, aiChatController.getAIChatHistory);
router.get("/history/:sessionId", protectUser, aiChatController.getAIChatHistory);

// Route to get AI chat sessions
router.get("/sessions", protectUser, aiChatController.getAISessions);

module.exports = router;

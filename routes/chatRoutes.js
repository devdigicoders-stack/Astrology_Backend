const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { protectAnyParticipant } = require("../middleware/authMiddleware");

router.get("/:callId", protectAnyParticipant, chatController.getChatMessages);
router.post("/send", protectAnyParticipant, chatController.sendMessage);

module.exports = router;

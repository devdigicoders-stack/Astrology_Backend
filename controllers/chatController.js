const ChatMessage = require("../models/ChatMessage");
const CallHistory = require("../models/CallHistory");

// @desc    Get all chat messages for a specific call session
// @route   GET /api/chat/:callId
// @access  Private (User or Astrologer)
exports.getChatMessages = async (req, res) => {
    try {
        const { callId } = req.params;

        // Verify the call session exists
        const callRecord = await CallHistory.findById(callId);
        if (!callRecord) {
            return res.status(404).json({ success: false, message: "Chat session not found" });
        }

        // Security Check: Only the User or Astrologer involved in this call can view the chat
        const requesterId = req.user ? req.user._id.toString() : (req.astrologer ? req.astrologer._id.toString() : null);
        
        if (!requesterId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (callRecord.user.toString() !== requesterId && callRecord.astrologer.toString() !== requesterId) {
            // Admin could potentially view this too if we add req.admin check
            if (!req.admin) {
                return res.status(403).json({ success: false, message: "Not authorized to view this chat" });
            }
        }

        // Fetch all messages for this callId, sorted by oldest first
        const messages = await ChatMessage.find({ callId }).sort({ createdAt: 1 });

        res.status(200).json({ success: true, count: messages.length, messages });
    } catch (error) {
        console.error("Get Chat Messages Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch chat messages" });
    }
};

// @desc    Send a new chat message
// @route   POST /api/chat/send
// @access  Private (User or Astrologer)
exports.sendMessage = async (req, res) => {
    try {
        const { callId, receiverId, receiverModel, message } = req.body;

        if (!callId || !receiverId || !receiverModel || !message) {
            return res.status(400).json({ success: false, message: "Please provide callId, receiverId, receiverModel, and message" });
        }

        const callRecord = await CallHistory.findById(callId);
        if (!callRecord || callRecord.status !== "ongoing") {
            return res.status(400).json({ success: false, message: "Chat session is not active or valid" });
        }

        // Determine who the sender is based on authentication
        let senderId, senderModel;
        if (req.user) {
            senderId = req.user._id;
            senderModel = "User";
        } else if (req.astrologer) {
            senderId = req.astrologer._id;
            senderModel = "Astrologer";
        } else {
            return res.status(401).json({ success: false, message: "Unauthorized sender" });
        }

        // Verify sender is part of this call
        if (callRecord.user.toString() !== senderId.toString() && callRecord.astrologer.toString() !== senderId.toString()) {
            return res.status(403).json({ success: false, message: "You are not part of this chat session" });
        }

        // Save message to Database
        const newMessage = await ChatMessage.create({
            callId,
            senderId,
            senderModel,
            receiverId,
            receiverModel,
            message
        });

        // Real-Time Push using WebSocket (so the other person sees it instantly)
        const io = req.app.get("io");
        const roomName = `call_${callId}`;
        io.to(roomName).emit("receive_chat_message", newMessage);

        res.status(201).json({ success: true, message: "Message sent successfully", data: newMessage });
    } catch (error) {
        console.error("Send Chat Message Error:", error);
        res.status(500).json({ success: false, message: "Failed to send message" });
    }
};

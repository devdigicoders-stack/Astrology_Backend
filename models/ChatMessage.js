const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema(
    {
        callId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CallHistory",
            required: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            // Cannot use ref directly because it can be User or Astrologer, so we use refPath
            refPath: "senderModel",
        },
        senderModel: {
            type: String,
            required: true,
            enum: ["User", "Astrologer"],
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: "receiverModel",
        },
        receiverModel: {
            type: String,
            required: true,
            enum: ["User", "Astrologer"],
        },
        message: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);

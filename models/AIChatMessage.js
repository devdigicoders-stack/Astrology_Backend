const mongoose = require("mongoose");

const AIChatMessageSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        sessionId: {
            type: String,
            required: true,
        },
        sessionTitle: {
            type: String,
            default: "New Chat",
        },
        message: {
            type: String,
            required: true,
        },
        aiResponse: {
            type: String,
            required: true,
        },
        isPaid: {
            type: Boolean,
            default: false, // true if wallet balance was deducted
        },
        cost: {
            type: Number,
            default: 0, // amount deducted if paid
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("AIChatMessage", AIChatMessageSchema);

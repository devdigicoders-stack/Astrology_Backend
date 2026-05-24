const mongoose = require("mongoose");

const CallHistorySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        astrologer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Astrologer",
            required: true,
        },
        type: {
            type: String,
            enum: ["chat", "audio", "video"],
            required: true,
        },
        startTime: {
            type: Date,
            default: Date.now,
        },
        endTime: {
            type: Date,
        },
        totalDurationMinutes: {
            type: Number,
            default: 0,
        },
        totalCost: {
            type: Number,
            default: 0,
        },
        astrologerEarnings: {
            type: Number,
            default: 0,
        },
        superAdminEarnings: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ["pending", "rejected", "ongoing", "completed", "disconnected"],
            default: "pending",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("CallHistory", CallHistorySchema);

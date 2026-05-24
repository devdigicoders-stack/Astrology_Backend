const mongoose = require("mongoose");

const ComplaintSchema = new mongoose.Schema(
    {
        subject: {
            type: String,
            required: [true, "Subject required hai"],
            trim: true,
        },
        message: {
            type: String,
            required: [true, "Message required hai"],
            trim: true,
        },
        submitterType: {
            type: String,
            enum: ["user", "astrologer"], // Kisne submit kiya
            required: true,
        },
        submitterId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            // User ya Astrologer ka ID
        },
        submitterName: {
            type: String,
            default: "",
        },
        submitterEmail: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: ["pending", "in_progress", "resolved", "closed"],
            default: "pending",
        },
        adminReply: {
            type: String,
            default: "", // Admin ka jawab
        },
        repliedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            default: null, // Kis admin ne reply kiya
        },
        repliedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Complaint", ComplaintSchema);

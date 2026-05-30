const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User is required"],
        },
        astrologer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Astrologer",
            required: [true, "Astrologer is required"],
        },
        callId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CallHistory",
            required: [true, "Call ID is required to verify the consultation"],
        },
        rating: {
            type: Number,
            required: [true, "Rating is required"],
            min: [1, "Rating must be at least 1"],
            max: [5, "Rating cannot exceed 5"],
        },
        comment: {
            type: String,
            trim: true,
            maxlength: [500, "Comment cannot exceed 500 characters"],
        },
    },
    {
        timestamps: true,
    }
);

// Ensure a user can only review an astrologer once per call
ReviewSchema.index({ user: 1, astrologer: 1, callId: 1 }, { unique: true });

module.exports = mongoose.model("Review", ReviewSchema);

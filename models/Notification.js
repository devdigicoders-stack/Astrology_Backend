const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Notification title is required"],
            trim: true,
        },
        message: {
            type: String,
            required: [true, "Notification message is required"],
            trim: true,
        },
        targetAudience: {
            type: String,
            enum: ["all", "users", "astrologers"], // Kisको dikhana hai
            default: "all",
        },
        type: {
            type: String,
            enum: ["general", "promo", "alert", "update"],
            default: "general",
        },
        isActive: {
            type: Boolean,
            default: true, // false = deactivate (phone pe nahi dikhega)
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin", // Kis admin ne banaya
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Notification", NotificationSchema);

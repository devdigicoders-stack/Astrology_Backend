const mongoose = require("mongoose");

const WithdrawalRequestSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        astrologer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Astrologer",
            default: null,
        },
        userType: {
            type: String,
            enum: ["user", "astrologer"],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: [1, "Amount must be at least 1"],
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        bankDetails: {
            accountNumber: { type: String, default: "" },
            ifscCode: { type: String, default: "" },
            bankName: { type: String, default: "" },
            holderName: { type: String, default: "" },
            upiId: { type: String, default: "" },
        },
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            default: null, // Admin who processed the request
        },
        remarks: {
            type: String,
            default: "", // E.g., rejection reason or transaction reference
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("WithdrawalRequest", WithdrawalRequestSchema);

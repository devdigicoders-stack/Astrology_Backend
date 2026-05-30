const mongoose = require("mongoose");

const AstrologerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Astrologer name is required"],
            trim: true,
        },
        phoneNumber: {
            type: String,
            required: [true, "Phone number is required"],
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
        },
        expertise: {
            type: [String], // e.g., ["Vedic", "Tarot Reading", "Numerology"]
            default: [],
        },
        languages: {
            type: [String], // e.g., ["Hindi", "English"]
            default: [],
        },
        experience: {
            type: Number, // in years
            default: 0,
        },
        pricing: {
            chatRate: { type: Number, default: 0 },         // ₹ per minute
            audioCallRate: { type: Number, default: 0 },    // ₹ per minute
            videoCallRate: { type: Number, default: 0 },    // ₹ per minute
            kundaliRate: { type: Number, default: 0 }       // Flat ₹ for report
        },
        isVerified: {
            type: Boolean,
            default: false, // Must be approved by Admin/Super Admin
        },
        commissionPercentage: {
            type: Number,
            default: 0,
            min: [0, "Commission percentage cannot be negative"],
            max: [100, "Commission percentage cannot exceed 100"],
        },
        commissionSetBySuperAdmin: {
            type: Boolean,
            default: false, // true hoga jab SuperAdmin ne commission set kiya ho
        },
        availability: {
            type: String,
            enum: ['online', 'offline', 'busy'],
            default: 'offline',
        },
        profilePic: {
            type: String,
            default: "",
        },
        about: {
            type: String,
            default: "",
        },
        bankDetails: {
            accountNumber: { type: String, default: "" },
            ifscCode: { type: String, default: "" },
            bankName: { type: String, default: "" },
            holderName: { type: String, default: "" },
        },
        walletBalance: {
            type: Number, // Total earnings they can withdraw
            default: 0,
        },
        averageRating: {
            type: Number,
            default: 0,
            min: [0, "Rating cannot be below 0"],
            max: [5, "Rating cannot exceed 5"],
        },
        totalReviews: {
            type: Number,
            default: 0,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin", // Kis admin ne create kiya
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Astrologer", AstrologerSchema);

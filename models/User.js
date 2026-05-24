const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
    {
        name: {
            type: String,
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
            unique: true,
            sparse: true, // Allows multiple users to have no email set
            trim: true,
            lowercase: true,
        },
        walletBalance: {
            type: Number,
            default: 0,
        },
        gender: {
            type: String,
            enum: ["Male", "Female", "Other", ""],
            default: "",
        },
        dateOfBirth: {
            type: String, // format: YYYY-MM-DD
            default: "",
        },
        timeOfBirth: {
            type: String, // format: HH:MM
            default: "",
        },
        placeOfBirth: {
            type: String,
            default: "",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("User", UserSchema);

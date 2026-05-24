const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
        },
        role: {
            type: String,
            enum: ["admin", "superadmin"],
            default: "admin",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        walletBalance: {
            type: Number,
            default: 0, // Platform ki total commission kamayi yahaan store hogi
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Admin", AdminSchema);

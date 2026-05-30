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
        permissions: {
            type: [String],
            enum: [
                "view_astrologers", "create_astrologers", "edit_astrologers", "delete_astrologers", "verify_astrologers", "manage_commission",
                "view_pooja", "create_pooja", "edit_pooja", "delete_pooja",
                "view_products", "create_products", "edit_products", "delete_products",
                "view_orders", "update_order_status",
                "view_users", "edit_users", "delete_users", "manage_user_status",
                "view_calls", "delete_calls",
                "view_complaints", "edit_complaints", "delete_complaints",
                "view_notifications", "create_notifications", "edit_notifications", "delete_notifications",
                "view_pooja_bookings", "edit_pooja_bookings", "delete_pooja_bookings",
                "view_carts", "edit_carts", "delete_carts",
                "view_transactions", "delete_transactions", "recharge_wallet",
                "view_withdrawals", "manage_withdrawals",
                "view_dashboard"
            ],
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        walletBalance: {
            type: Number,
            default: 0, // Platform ki total commission kamayi yahaan store hogi
        },
        totalRechargeMoney: {
            type: Number,
            default: 0, // Razorpay se aane wala total recharge amount
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Admin", AdminSchema);

const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: [
                "wallet_recharge",   // Admin ne wallet mein paisa daala
                "call_deduction",    // Call (video/audio/chat) ke liye deduction
                "pooja_booking",     // Pooja book karne pe deduction
                "product_purchase",  // Product khareedne pe deduction (Razorpay)
                "refund",            // Refund mila
                "kundali_generation", // Kundali generate karne pe deduction
                "ai_chat",           // AI Astrologer Chat deduction
                "daily_horoscope",   // Daily Horoscope check
                "weekly_horoscope",  // Weekly Horoscope check
            ],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        direction: {
            type: String,
            enum: ["credit", "debit"], // credit = paisa aaya, debit = paisa gaya
            required: true,
        },
        balanceBefore: {
            type: Number,
            default: 0,
        },
        balanceAfter: {
            type: Number,
            default: 0,
        },
        description: {
            type: String,
            default: "",
        },
        // Reference IDs — optional, context ke liye
        callId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CallHistory",
            default: null,
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null,
        },
        poojaBookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PoojaBooking",
            default: null,
        },
        // Who made this transaction (for admin recharge)
        doneBy: {
            type: String,
            default: "system", // "system", "admin", or user ID
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Transaction", TransactionSchema);

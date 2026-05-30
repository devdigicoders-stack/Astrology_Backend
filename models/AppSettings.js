const mongoose = require("mongoose");

// Yeh model Global App Settings store karta hai
// Jaise: Kundali generate karne ka rate, etc.
// Is collection mein humesha ek hi document hoga (singleton pattern)

const AppSettingsSchema = new mongoose.Schema(
    {
        // Kundali generate karne ka charge (in rupees/wallet credits)
        kundaliRate: {
            type: Number,
            default: 10, // Default: ₹10 per kundali
        },

        // AI Astrologer Chat charge per message
        aiChatRate: {
            type: Number,
            default: 5, // Default: ₹5 per message
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("AppSettings", AppSettingsSchema);

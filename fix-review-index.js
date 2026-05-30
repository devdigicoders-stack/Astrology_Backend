/**
 * One-time fix script: Purana galat index "user_1_call_1" drop karo
 * Run: node fix-review-index.js
 */
require("dotenv").config();
const mongoose = require("mongoose");

async function fixIndex() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected!");

        const collection = mongoose.connection.collection("reviews");
        const indexes = await collection.indexes();
        console.log("Current indexes on reviews collection:", indexes.map(i => i.name));

        // Purana galat index drop karo
        try {
            await collection.dropIndex("user_1_call_1");
            console.log("✅ Old index 'user_1_call_1' dropped successfully!");
        } catch (e) {
            console.log("ℹ️  Index 'user_1_call_1' not found (already removed or never existed):", e.message);
        }

        const newIndexes = await collection.indexes();
        console.log("✅ Remaining indexes:", newIndexes.map(i => i.name));

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected. Script done!");
        process.exit(0);
    }
}

fixIndex();

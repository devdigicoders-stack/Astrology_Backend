const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// Load models
const User = require("./models/User");
const Astrologer = require("./models/Astrologer");
const CallHistory = require("./models/CallHistory");

async function testAgoraLive() {
    try {
        await mongoose.connect("mongodb://localhost:27017/Astolargry");
        console.log("Connected to DB");

        // Find existing users
        const user = await User.findOne();
        const astro = await Astrologer.findOne();

        if (!user || !astro) {
            console.log("Warning: No user or astrologer found in DB to run the test. Test skipped.");
            mongoose.connection.close();
            return;
        }

        // Create a temporary call
        const call = await CallHistory.create({
            user: user._id,
            astrologer: astro._id,
            type: "video",
            status: "ongoing",
            startTime: new Date()
        });

        // 4. Generate JWT token for user
        const token = jwt.sign({ id: user._id.toString(), role: "user" }, process.env.JWT_SECRET || "fallback_secret_key", { expiresIn: "1h" });

        // 5. Make fetch request to running server
        console.log(`Hitting API: http://localhost:5000/api/calls/${call._id}/agora-token`);
        const response = await fetch(`http://localhost:5000/api/calls/${call._id}/agora-token`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log("\n--- Agora API Response ---");
        console.dir(data, { depth: null, colors: true });

        if (data.success && data.token) {
            console.log("\n✅ SUCCESS! Token was generated successfully by the server.");
            console.log("Your .env keys are working perfectly!");
        } else {
            console.log("\n❌ FAILED! Token was not generated.");
        }

        // Cleanup
        await CallHistory.findByIdAndDelete(call._id);
        
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.connection.close();
    }
}

testAgoraLive();

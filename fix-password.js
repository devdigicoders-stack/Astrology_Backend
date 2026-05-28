const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

async function fixPassword() {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/astrology");
        console.log("Connected to MongoDB.");

        const email = "superadmin@astrology.com";
        const admin = await Admin.findOne({ email });

        if (admin) {
            admin.password = "password123";
            await admin.save();
            console.log("✅ Fixed password to plain text in database!");
        } else {
            console.log("Admin not found.");
        }
        
    } catch (error) {
        console.error("Error:", error);
    } finally {
        mongoose.connection.close();
    }
}

fixPassword();

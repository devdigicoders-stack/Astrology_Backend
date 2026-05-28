const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

async function createSuperAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/astrology");
        console.log("Connected to MongoDB.");

        const email = "super@admin.com";
        await Admin.deleteMany({}); // Wipe any existing

        const superAdmin = await Admin.create({
            name: "Ultimate Boss",
            email: email,
            password: "password123", // PLAIN TEXT
            role: "superadmin",
            permissions: []
        });

        console.log("✅ Super Admin successfully created in PLAIN TEXT!");
        console.log("Email: ", superAdmin.email);
        console.log("Password: ", superAdmin.password);
        
    } catch (error) {
        console.error("Error creating Super Admin:", error);
    } finally {
        mongoose.connection.close();
    }
}

createSuperAdmin();

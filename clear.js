const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

async function clearDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/astrology");
        await Admin.deleteMany({});
        console.log("Database cleared.");
    } catch (error) {
        console.error("Error:", error);
    } finally {
        mongoose.connection.close();
    }
}

clearDB();

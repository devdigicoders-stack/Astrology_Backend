const mongoose = require('mongoose');
const Astrologer = require('./models/Astrologer');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/Astolargry').then(async () => {
  console.log("Connected to MongoDB.");
  
  const phone = "8123456789";
  
  const existing = await Astrologer.findOne({ phoneNumber: phone });
  if (existing) {
    console.log("Astrologer already exists!");
    process.exit(0);
  }

  const astro = new Astrologer({
    name: "Astro Vivek",
    phoneNumber: phone,
    email: "astro@example.com",
    expertise: ["Vedic Astrology"],
    languages: ["Hindi", "English"],
    experience: 5,
    pricing: { chatRate: 10, callRate: 15, videoRate: 20 },
    isVerified: true, // Needs to be true to login
    availability: "online"
  });

  await astro.save();
  console.log("Test Astrologer created successfully! You can now login with", phone);
  process.exit(0);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});

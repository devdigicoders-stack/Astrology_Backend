const express = require("express");
const router = express.Router();
const { getHoroscope, getRates } = require("../controllers/horoscopeController");
const { protectUser } = require("../middleware/authMiddleware");

// Public route for fetching dynamic pricing rates
router.get("/rates", getRates);

// Single combined API - pass { type: "daily" } or { type: "weekly" } in body
router.post("/fetch", protectUser, getHoroscope);

module.exports = router;

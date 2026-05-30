const express = require("express");
const router = express.Router();
const kundaliController = require("../controllers/kundaliController");
const kundaliPdfController = require("../controllers/kundaliPdfController");
const { protectUser } = require("../middleware/authMiddleware");

// Get current kundali rate (public - so frontend can show it before login)
router.get("/rate", kundaliController.getKundaliRate);

// Generate Kundali - User must be logged in + has sufficient wallet balance
router.post("/generate", protectUser, kundaliController.generateKundali);

// Download Kundali as PDF - User must be logged in
router.post("/download", protectUser, kundaliPdfController.downloadKundali);

module.exports = router;

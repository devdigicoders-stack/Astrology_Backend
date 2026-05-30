const express = require("express");
const router = express.Router();
const { protectUser } = require("../middleware/authMiddleware");
const { addReview, getAstrologerReviews } = require("../controllers/reviewController");

// Submit a new review (User must be logged in)
router.post("/", protectUser, addReview);

// Get reviews for a specific astrologer (Publicly visible to all users/astrologers)
router.get("/astrologer/:astrologerId", getAstrologerReviews);

module.exports = router;

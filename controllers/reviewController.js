const Review = require("../models/Review");
const Astrologer = require("../models/Astrologer");
const CallHistory = require("../models/CallHistory");
const mongoose = require("mongoose");

// @desc    Add a review for an astrologer
// @route   POST /api/reviews
// @access  Private (User only)
exports.addReview = async (req, res) => {
    try {
        const { astrologerId, callId, rating, comment } = req.body;

        if (!astrologerId || !callId || !rating) {
            return res.status(400).json({ success: false, message: "Astrologer ID, Call ID, and Rating are required" });
        }

        // 1. Verify that the call actually happened and belongs to this user & astrologer
        const callRecord = await CallHistory.findById(callId);
        if (!callRecord) {
            return res.status(404).json({ success: false, message: "Call record not found" });
        }

        if (callRecord.user.toString() !== req.user._id.toString() || callRecord.astrologer.toString() !== astrologerId) {
            return res.status(403).json({ success: false, message: "You are not authorized to review this specific consultation" });
        }

        if (callRecord.status !== "completed") {
            return res.status(400).json({ success: false, message: "You can only review completed calls" });
        }

        // 2. Check if a review already exists for this exact call
        const existingReview = await Review.findOne({ callId, user: req.user._id });
        if (existingReview) {
            return res.status(400).json({ success: false, message: "You have already submitted a review for this consultation" });
        }

        // 3. Create the review
        const review = await Review.create({
            user: req.user._id,
            astrologer: astrologerId,
            callId: callId,
            rating: Number(rating),
            comment: comment || ""
        });

        // 4. Update the Astrologer's average rating
        // Use MongoDB aggregation for accurate calculation
        const stats = await Review.aggregate([
            {
                $match: { astrologer: new mongoose.Types.ObjectId(astrologerId) }
            },
            {
                $group: {
                    _id: "$astrologer",
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 }
                }
            }
        ]);

        if (stats.length > 0) {
            await Astrologer.findByIdAndUpdate(astrologerId, {
                averageRating: Math.round(stats[0].averageRating * 10) / 10, // Round to 1 decimal
                totalReviews: stats[0].totalReviews
            });
        }

        res.status(201).json({
            success: true,
            message: "Review submitted successfully",
            review
        });

    } catch (error) {
        console.error("Add Review Error:", error);
        // Handle MongoDB duplicate key error (E11000) — user already reviewed this call
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "You have already submitted a review for this consultation." });
        }
        res.status(500).json({ success: false, message: "Failed to submit review" });
    }
};

// @desc    Get all reviews for an astrologer
// @route   GET /api/reviews/astrologer/:astrologerId
// @access  Public (or Private depending on app logic)
exports.getAstrologerReviews = async (req, res) => {
    try {
        const { astrologerId } = req.params;

        // Verify astrologer exists
        const astrologer = await Astrologer.findById(astrologerId);
        if (!astrologer) {
            return res.status(404).json({ success: false, message: "Astrologer not found" });
        }

        const reviews = await Review.find({ astrologer: astrologerId })
            .populate("user", "name profileImage")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: reviews.length,
            averageRating: astrologer.averageRating,
            totalReviews: astrologer.totalReviews,
            reviews
        });
    } catch (error) {
        console.error("Get Reviews Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch reviews" });
    }
};

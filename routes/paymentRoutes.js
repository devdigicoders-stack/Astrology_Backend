const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { protectUser } = require("../middleware/authMiddleware");

// ============================================================
// @route   POST /api/payments/create-recharge-order
// @desc    Create Razorpay order for wallet recharge
// @access  Private (User)
// ============================================================
router.post("/create-recharge-order", protectUser, paymentController.createRechargeOrder);

// ============================================================
// @route   POST /api/payments/verify-recharge
// @desc    Verify Razorpay payment and credit wallet
// @access  Private (User)
// ============================================================
router.post("/verify-recharge", protectUser, paymentController.verifyRecharge);

module.exports = router;

const express = require("express");
const router = express.Router();
const withdrawalController = require("../controllers/withdrawalController");
const { protectAnyParticipant, protectAdmin, checkPermission } = require("../middleware/authMiddleware");

// @route   POST /api/withdrawals/request
// @desc    Request a withdrawal
// @access  Private (User or Astrologer)
router.post("/request", protectAnyParticipant, withdrawalController.requestWithdrawal);

// @route   GET /api/withdrawals/my-requests
// @desc    Get logged in user/astrologer's withdrawal history
// @access  Private (User or Astrologer)
router.get("/my-requests", protectAnyParticipant, withdrawalController.getMyWithdrawals);

// @route   GET /api/withdrawals/admin
// @desc    Get all withdrawals for Admin panel
// @access  Private (Admin)
// Assuming "view_withdrawals" or similar permission is needed
router.get("/admin", protectAdmin, checkPermission("view_withdrawals"), withdrawalController.getAllWithdrawals);

// @route   PUT /api/withdrawals/admin/:id/status
// @desc    Approve or reject a withdrawal request
// @access  Private (Admin)
// Admin approve/rejects withdrawal request
router.put("/admin/:id/status", protectAdmin, checkPermission("manage_withdrawals"), withdrawalController.processWithdrawal);

module.exports = router;

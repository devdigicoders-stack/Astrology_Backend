const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { protectAdmin, checkPermission } = require("../middleware/authMiddleware");

// @route   GET /api/dashboard/admin
// @desc    Get all stats for Admin Dashboard
// @access  Private (Admin/Superadmin)
router.get("/admin", protectAdmin, checkPermission("view_dashboard"), dashboardController.getDashboardStats);

module.exports = router;

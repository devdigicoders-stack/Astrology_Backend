const express = require("express");
const router = express.Router();
const poojaBookingController = require("../controllers/poojaBookingController");
const { protectUser, protectAdmin, authorizeRoles } = require("../middleware/authMiddleware");

// User routes
router.post("/", protectUser, poojaBookingController.bookPooja);
router.get("/history", protectUser, poojaBookingController.getUserPoojaHistory);

// Admin routes (Strictly SuperAdmin only)
router.get("/admin", protectAdmin, authorizeRoles("superadmin"), poojaBookingController.getAllPoojaBookings);

module.exports = router;

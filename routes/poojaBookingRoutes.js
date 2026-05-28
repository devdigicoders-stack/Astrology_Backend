const express = require("express");
const router = express.Router();
const poojaBookingController = require("../controllers/poojaBookingController");
const { protectUser, protectAdmin, checkPermission } = require("../middleware/authMiddleware");

// User routes
router.post("/", protectUser, poojaBookingController.bookPooja);
router.get("/history", protectUser, poojaBookingController.getUserPoojaHistory);

// Admin routes (Strictly SuperAdmin only)
router.get("/admin", protectAdmin, checkPermission("view_pooja_bookings"), poojaBookingController.getAllPoojaBookings);
router.put("/:id/status", protectAdmin, checkPermission("edit_pooja_bookings"), poojaBookingController.updateBookingStatus);
router.delete("/:id", protectAdmin, checkPermission("delete_pooja_bookings"), poojaBookingController.deleteBooking);

module.exports = router;

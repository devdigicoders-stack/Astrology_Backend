const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { protectAdmin, protectUser, protectAstrologer, authorizeRoles } = require("../middleware/authMiddleware");

// =========================================================
// ADMIN & SUPER ADMIN — Notification Manage Karne Ki Routes
// =========================================================
router.post("/", protectAdmin, authorizeRoles("superadmin"), notificationController.createNotification);               // Send notification
router.get("/", protectAdmin, authorizeRoles("superadmin"), notificationController.getAllNotificationsAdmin);          // Sab dekho
router.get("/:id", protectAdmin, authorizeRoles("superadmin"), notificationController.getNotificationById);           // Ek dekho
router.put("/:id", protectAdmin, authorizeRoles("superadmin"), notificationController.updateNotification);            // Edit karo
router.delete("/:id", protectAdmin, authorizeRoles("superadmin"), notificationController.deleteNotification);         // Delete karo
router.patch("/:id/status", protectAdmin, authorizeRoles("superadmin"), notificationController.toggleNotificationStatus); // Active/Inactive

// =========================================================
// USER (CUSTOMER) — Phone Pe Notifications Dekhne Ki Route
// =========================================================
router.get("/user/feed", protectUser, notificationController.getNotificationsForUser);

// =========================================================
// ASTROLOGER — Phone Pe Notifications Dekhne Ki Route
// =========================================================
router.get("/astrologer/feed", protectAstrologer, notificationController.getNotificationsForAstrologer);

module.exports = router;

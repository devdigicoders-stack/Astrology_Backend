const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { protectAdmin, protectUser, protectAstrologer, checkPermission } = require("../middleware/authMiddleware");

// =========================================================
// ADMIN & SUPER ADMIN — Notification Manage Karne Ki Routes
// =========================================================
router.post("/", protectAdmin, checkPermission("create_notifications"), notificationController.createNotification);               // Send notification
router.get("/", protectAdmin, checkPermission("view_notifications"), notificationController.getAllNotificationsAdmin);          // Sab dekho
router.get("/:id", protectAdmin, checkPermission("view_notifications"), notificationController.getNotificationById);           // Ek dekho
router.put("/:id", protectAdmin, checkPermission("edit_notifications"), notificationController.updateNotification);            // Edit karo
router.delete("/:id", protectAdmin, checkPermission("delete_notifications"), notificationController.deleteNotification);         // Delete karo
router.patch("/:id/status", protectAdmin, checkPermission("edit_notifications"), notificationController.toggleNotificationStatus); // Active/Inactive

// =========================================================
// USER (CUSTOMER) — Phone Pe Notifications Dekhne Ki Route
// =========================================================
router.get("/user/feed", protectUser, notificationController.getNotificationsForUser);

// =========================================================
// ASTROLOGER — Phone Pe Notifications Dekhne Ki Route
// =========================================================
router.get("/astrologer/feed", protectAstrologer, notificationController.getNotificationsForAstrologer);

module.exports = router;

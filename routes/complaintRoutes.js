const express = require("express");
const router = express.Router();
const complaintController = require("../controllers/complaintController");
const { protectAdmin, protectUser, protectAstrologer, checkPermission } = require("../middleware/authMiddleware");

// =========================================================
// USER — Complaint Submit & Apni Complaints Dekho
// =========================================================
router.post("/user", protectUser, complaintController.submitComplaintByUser);           // Submit complaint
router.get("/user/my", protectUser, complaintController.getMyComplaintsByUser);         // Apni complaints dekho

// =========================================================
// ASTROLOGER — Complaint Submit & Apni Complaints Dekho
// =========================================================
router.post("/astrologer", protectAstrologer, complaintController.submitComplaintByAstrologer);      // Submit complaint
router.get("/astrologer/my", protectAstrologer, complaintController.getMyComplaintsByAstrologer);    // Apni complaints dekho

// =========================================================
// ADMIN & SUPER ADMIN — Complaint Manage Karne Ki Routes
// =========================================================
router.get("/", protectAdmin, checkPermission("view_complaints"), complaintController.getAllComplaintsAdmin);                // Sab dekho (filter: ?status=pending&submitterType=user)
router.get("/:id", protectAdmin, checkPermission("view_complaints"), complaintController.getComplaintByIdAdmin);            // ID se ek dekho
router.put("/:id/reply", protectAdmin, checkPermission("edit_complaints"), complaintController.replyToComplaint);           // Reply / Edit reply
router.patch("/:id/status", protectAdmin, checkPermission("edit_complaints"), complaintController.updateComplaintStatus);   // Status update karo
router.delete("/:id", protectAdmin, checkPermission("delete_complaints"), complaintController.deleteComplaint);               // Delete karo

module.exports = router;

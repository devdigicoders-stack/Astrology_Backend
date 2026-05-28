const express = require("express");
const router = express.Router();
const astrologerController = require("../controllers/astrologerController");
const { protectAstrologer, protectAdmin, checkPermission, authorizeRoles } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Authentication & Login routes for Astrologer (Public)
router.post("/send-otp", astrologerController.sendOTP);
router.post("/login", astrologerController.loginAstrologer);

// Admin/Super-Admin — Astrologer Create Karo (PRIVATE — self registration band!)
router.post("/register", protectAdmin, checkPermission("create_astrologers"), upload.single('profilePic'), astrologerController.registerAstrologer);

// Protected routes for Astrologer
router.get("/profile", protectAstrologer, (req, res) => {
    res.status(200).json({
        success: true,
        message: "Astrologer profile fetched successfully (Protected Route)",
        astrologer: req.astrologer,
    });
});
router.patch("/status", protectAstrologer, astrologerController.updateAvailabilityStatus);

// ==========================================
// Customer Public Routes (Search & Filter)
// ==========================================
router.get("/public", astrologerController.getPublicAstrologers);
router.get("/public/:id", astrologerController.getPublicAstrologerById);

// ==========================================
// Admin/Super-Admin Astrologer Management Routes
// ==========================================
router.get("/", protectAdmin, checkPermission("view_astrologers"), astrologerController.getAllAstrologers);
router.patch("/commission", protectAdmin, checkPermission("manage_commission"), astrologerController.setGlobalAstrologerCommission); // Commission granular control
router.get("/:id", protectAdmin, checkPermission("view_astrologers"), astrologerController.getAstrologerById);
router.put("/:id", protectAdmin, checkPermission("edit_astrologers"), upload.single('profilePic'), astrologerController.updateAstrologer);
router.patch("/:id/verify", protectAdmin, checkPermission("verify_astrologers"), astrologerController.toggleAstrologerVerification);
router.delete("/:id", protectAdmin, checkPermission("delete_astrologers"), astrologerController.deleteAstrologer);

module.exports = router;

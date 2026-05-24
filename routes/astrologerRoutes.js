const express = require("express");
const router = express.Router();
const astrologerController = require("../controllers/astrologerController");
const { protectAstrologer, protectAdmin, authorizeRoles } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Authentication & Login routes for Astrologer (Public)
router.post("/send-otp", astrologerController.sendOTP);
router.post("/login", astrologerController.loginAstrologer);

// Admin/Super-Admin — Astrologer Create Karo (PRIVATE — self registration band!)
router.post("/register", protectAdmin, authorizeRoles("superadmin"), upload.single('profilePic'), astrologerController.registerAstrologer);

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
router.get("/", protectAdmin, authorizeRoles("superadmin"), astrologerController.getAllAstrologers);
router.patch("/commission", protectAdmin, authorizeRoles("superadmin"), astrologerController.setGlobalAstrologerCommission);
router.get("/:id", protectAdmin, authorizeRoles("superadmin"), astrologerController.getAstrologerById);
router.put("/:id", protectAdmin, authorizeRoles("superadmin"), upload.single('profilePic'), astrologerController.updateAstrologer);
router.patch("/:id/verify", protectAdmin, authorizeRoles("superadmin"), astrologerController.toggleAstrologerVerification);
router.delete("/:id", protectAdmin, authorizeRoles("superadmin"), astrologerController.deleteAstrologer);

module.exports = router;

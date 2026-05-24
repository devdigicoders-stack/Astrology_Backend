const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protectAdmin, authorizeRoles } = require("../middleware/authMiddleware");

// Public admin routes
router.post("/register", adminController.registerAdmin);
router.post("/login", adminController.loginAdmin);

// Protected admin routes
router.get("/profile", protectAdmin, adminController.getAdminProfile);
router.patch("/change-password", protectAdmin, adminController.changePassword);

// Example role-protected route (Super Admin only test)
router.get("/super-only-test", protectAdmin, authorizeRoles("superadmin"), (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome Super Admin! This is a highly restricted route.",
        admin: req.admin,
    });
});

// Manage Admins (Super Admin only endpoints)
router.get("/all", protectAdmin, authorizeRoles("superadmin"), adminController.getAllAdmins);
router.get("/:id", protectAdmin, authorizeRoles("superadmin"), adminController.getAdminById);
router.put("/:id", protectAdmin, authorizeRoles("superadmin"), adminController.updateAdmin);
router.delete("/:id", protectAdmin, authorizeRoles("superadmin"), adminController.deleteAdmin);
router.patch("/:id/status", protectAdmin, authorizeRoles("superadmin"), adminController.toggleAdminStatus);

module.exports = router;

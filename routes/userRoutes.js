const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protectUser, protectAdmin, authorizeRoles } = require("../middleware/authMiddleware");

// Authentication routes for User/Customer
router.post("/send-otp", userController.sendOTP);
router.post("/verify-otp", userController.verifyOTPUser);

// Protected routes for User/Customer
router.get("/profile", protectUser, (req, res) => {
    res.status(200).json({
        success: true,
        message: "User profile fetched successfully (Protected Route)",
        user: req.user,
    });
});
router.put("/profile", protectUser, userController.updateProfile);

// Admin/Super-Admin User Management Routes (SUPERADMIN ONLY 🔒)
router.get("/", protectAdmin, authorizeRoles("superadmin"), userController.getAllUsers);
router.get("/:id", protectAdmin, authorizeRoles("superadmin"), userController.getUserById);
router.put("/:id", protectAdmin, authorizeRoles("superadmin"), userController.updateUser);
router.delete("/:id", protectAdmin, authorizeRoles("superadmin"), userController.deleteUser);
router.patch("/:id/status", protectAdmin, authorizeRoles("superadmin"), userController.toggleUserStatus);

module.exports = router;

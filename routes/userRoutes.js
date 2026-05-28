const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protectUser, protectAdmin, checkPermission, authorizeRoles } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

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
router.put("/profile", protectUser, upload.single("profileImage"), userController.updateProfile);

// Admin User Management Routes (SaaS isolation applies here generally just by giving permission to see users)
router.get("/", protectAdmin, checkPermission("view_users"), userController.getAllUsers);
router.get("/:id", protectAdmin, checkPermission("view_users"), userController.getUserById);
router.put("/:id", protectAdmin, checkPermission("edit_users"), upload.single("profileImage"), userController.updateUser);
router.delete("/:id", protectAdmin, checkPermission("delete_users"), userController.deleteUser);
router.patch("/:id/status", protectAdmin, checkPermission("manage_user_status"), userController.toggleUserStatus);

module.exports = router;

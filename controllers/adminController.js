const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

// Helper to generate JWT
const generateToken = (id, role) => {
    return jwt.sign(
        { id, role },
        process.env.JWT_SECRET || "fallback_secret_key",
        { expiresIn: "30d" }
    );
};

// @desc    Register a new Admin/Super Admin
// @route   POST /api/admin/register
// @access  Public (Initial setup only) / Protected (Super Admin only after initial setup)
exports.registerAdmin = async (req, res) => {
    try {
        const { name, email, password, role, permissions } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Please fill in all fields (name, email, password)" });
        }

        // Check if any admin exists in the database
        const adminCount = await Admin.countDocuments({});

        if (adminCount > 0) {
            // If admins exist, we must restrict registration to Super Admins only
            let token;
            if (
                req.headers.authorization &&
                req.headers.authorization.startsWith("Bearer")
            ) {
                token = req.headers.authorization.split(" ")[1];
            }

            if (!token) {
                return res.status(403).json({
                    success: false,
                    message: "Access Denied: Only a Super Admin can register new Admins",
                });
            }

            // Verify the token
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_key");
                const requesterAdmin = await Admin.findById(decoded.id);

                if (!requesterAdmin || requesterAdmin.role !== "superadmin") {
                    return res.status(403).json({
                        success: false,
                        message: "Access Denied: Only an active Super Admin can register new Admins",
                    });
                }
            } catch (jwtError) {
                return res.status(401).json({ success: false, message: "Not authorized: Invalid token" });
            }
        }

        // Check if admin already exists
        const adminExists = await Admin.findOne({ email });
        if (adminExists) {
            return res.status(400).json({ success: false, message: "Admin with this email already exists" });
        }

        // Determine role (default to admin, allow superadmin for the first user)
        const finalRole = adminCount === 0 ? (role || "superadmin") : (role || "admin");

        // Create Admin (Plain Text password)
        const newAdmin = await Admin.create({
            name,
            email,
            password, // Saved in plain text as per requirements
            role: finalRole,
            permissions: permissions || [],
        });

        res.status(201).json({
            success: true,
            message: `${newAdmin.role} registered successfully`,
            admin: {
                id: newAdmin._id,
                name: newAdmin.name,
                email: newAdmin.email,
                role: newAdmin.role,
                permissions: newAdmin.permissions,
            },
        });
    } catch (error) {
        console.error("Admin Registration Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to register admin" });
    }
};

// @desc    Admin Login
// @route   POST /api/admin/login
// @access  Public
exports.loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        // Find Admin
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        if (!admin.isActive) {
            return res.status(403).json({ success: false, message: "This admin account is deactivated" });
        }

        // Compare plain text passwords
        if (password !== admin.password) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        // Generate JWT token
        const token = generateToken(admin._id, admin.role);

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
            },
        });
    } catch (error) {
        console.error("Admin Login Error:", error.message);
        res.status(500).json({ success: false, message: "Login failed" });
    }
};

// @desc    Get Admin Profile
// @route   GET /api/admin/profile
// @access  Private (Admins and Super Admins)
exports.getAdminProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin._id).select("-password");
        res.status(200).json({
            success: true,
            admin,
        });
    } catch (error) {
        console.error("Get Admin Profile Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to get profile" });
    }
};

// @desc    Update Admin's Own Profile
// @route   PUT /api/admin/profile
// @access  Private (Admins and Super Admins)
exports.updateAdminProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin._id);
        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        const { name, email } = req.body;

        if (email && email !== admin.email) {
            const emailExists = await Admin.findOne({ email });
            if (emailExists) {
                return res.status(400).json({ success: false, message: "Email is already in use by another admin" });
            }
            admin.email = email;
        }

        if (name) {
            admin.name = name;
        }

        await admin.save();

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
            },
        });
    } catch (error) {
        console.error("Update Admin Profile Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update profile" });
    }
};

// @desc    Get All Admins
// @route   GET /api/admin/all
// @access  Private (Super Admin only)
exports.getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.find({}).select("-password").sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: admins.length,
            admins,
        });
    } catch (error) {
        console.error("Get All Admins Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to get admins" });
    }
};

// @desc    Get Admin By ID
// @route   GET /api/admin/:id
// @access  Private (Super Admin only)
exports.getAdminById = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id).select("-password");
        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }
        res.status(200).json({
            success: true,
            admin,
        });
    } catch (error) {
        console.error("Get Admin By ID Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to get admin details" });
    }
};

// @desc    Update Admin Details
// @route   PUT /api/admin/:id
// @access  Private (Super Admin only)
exports.updateAdmin = async (req, res) => {
    try {
        const { name, email, password, role, isActive, permissions } = req.body;
        const admin = await Admin.findById(req.params.id);
        
        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        // Check if email is already taken by another admin
        if (email && email.toLowerCase() !== admin.email.toLowerCase()) {
            const emailExists = await Admin.findOne({ email: email.toLowerCase() });
            if (emailExists) {
                return res.status(400).json({ success: false, message: "Email is already in use by another admin" });
            }
            admin.email = email.toLowerCase();
        }

        if (name) admin.name = name;
        if (role) admin.role = role;
        if (isActive !== undefined) admin.isActive = isActive;
        if (password) admin.password = password; // Stored in plain text
        if (permissions !== undefined) admin.permissions = permissions;

        await admin.save();

        res.status(200).json({
            success: true,
            message: "Admin details updated successfully",
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
                isActive: admin.isActive,
            },
        });
    } catch (error) {
        console.error("Update Admin Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update admin" });
    }
};

// @desc    Delete Admin
// @route   DELETE /api/admin/:id
// @access  Private (Super Admin only)
exports.deleteAdmin = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        // Prevent Super Admin from deleting themselves accidentally
        if (admin._id.toString() === req.admin._id.toString()) {
            return res.status(400).json({ success: false, message: "You cannot delete your own Super Admin account" });
        }

        await Admin.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Admin deleted successfully",
        });
    } catch (error) {
        console.error("Delete Admin Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to delete admin" });
    }
};

// @desc    Toggle Admin Active Status (Deactivate / Activate)
// @route   PATCH /api/admin/:id/status
// @access  Private (Super Admin only)
exports.toggleAdminStatus = async (req, res) => {
    try {
        const { isActive } = req.body;
        
        if (isActive === undefined) {
            return res.status(400).json({ success: false, message: "Please provide isActive status (true/false)" });
        }

        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        // Prevent Super Admin from deactivating themselves
        if (admin._id.toString() === req.admin._id.toString() && isActive === false) {
            return res.status(400).json({ success: false, message: "You cannot deactivate your own Super Admin account" });
        }

        admin.isActive = isActive;
        await admin.save();

        res.status(200).json({
            success: true,
            message: `Admin account has been ${isActive ? "activated" : "deactivated"} successfully`,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                isActive: admin.isActive,
            }
        });
    } catch (error) {
        console.error("Toggle Admin Status Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update admin status" });
    }
};

// @desc    Change Own Password
// @route   PATCH /api/admin/change-password
// @access  Private (Admin & Super Admin — apna password change karo)
exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Old password aur new password dono required hain",
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "New password kam se kam 6 characters ka hona chahiye",
            });
        }

        const admin = await Admin.findById(req.admin._id);

        // Old password verify karo (plain text)
        if (oldPassword !== admin.password) {
            return res.status(401).json({
                success: false,
                message: "Old password galat hai",
            });
        }

        if (oldPassword === newPassword) {
            return res.status(400).json({
                success: false,
                message: "New password, old password se alag hona chahiye",
            });
        }

        // New password save karo (plain text)
        admin.password = newPassword;
        await admin.save();

        res.status(200).json({
            success: true,
            message: "Password successfully change ho gaya!",
        });
    } catch (error) {
        console.error("Change Password Error:", error.message);
        res.status(500).json({ success: false, message: "Password change karne mein error aaya" });
    }
};

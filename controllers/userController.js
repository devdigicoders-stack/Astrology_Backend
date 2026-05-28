const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Helper to generate JWT
const generateToken = (id) => {
    return jwt.sign(
        { id, role: "user" },
        process.env.JWT_SECRET || "fallback_secret_key",
        { expiresIn: "30d" }
    );
};


exports.sendOTP = async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ success: false, message: "Phone number is required" });
        }

        if (!/^\d{10}$/.test(phoneNumber)) {
            return res.status(400).json({ success: false, message: "Please enter a valid 10-digit phone number" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[User OTP Sent to ${phoneNumber}]: ${otp}`);

        res.status(200).json({
            success: true,
            message: "OTP sent successfully (Check server console or use '123456' for testing)",
            otp: otp, // In development, send OTP back to client
        });
    } catch (error) {
        console.error("User Send OTP Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to send OTP" });
    }
};

exports.verifyOTPUser = async (req, res) => {
    try {
        const {
            phoneNumber,
            otp,
            name,
            email,
            gender,
            dateOfBirth,
            timeOfBirth,
            placeOfBirth,
        } = req.body;

        if (!phoneNumber || !otp) {
            return res.status(400).json({ success: false, message: "Phone number and OTP are required" });
        }

        if (!/^\d{10}$/.test(phoneNumber)) {
            return res.status(400).json({ success: false, message: "Please enter a valid 10-digit phone number" });
        }

        // Mock verification check
        if (otp !== "123456" && (otp.length !== 6 || isNaN(otp))) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        let user = await User.findOne({ phoneNumber });

        // If user does NOT exist, they are a new registration
        if (!user) {
            // Check if they have provided the required registration details
            if (!name || !email) {
                return res.status(200).json({
                    success: false,
                    needDetails: true,
                    message: "You are a new user. Please provide your details (name and email) to complete registration.",
                });
            }

            // Check if email already exists
            const existingEmail = await User.findOne({ email });
            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    message: "Email is already in use by another user.",
                });
            }

            // Create new user with all supplied details
            user = await User.create({
                phoneNumber,
                name,
                email,
                gender: gender || "",
                dateOfBirth: dateOfBirth || "",
                timeOfBirth: timeOfBirth || "",
                placeOfBirth: placeOfBirth || "",
            });
        }

        if (!user.isActive) {
            return res.status(403).json({ success: false, message: "Your account is deactivated" });
        }

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: "Verification and login successful",
            token,
            user,
        });
    } catch (error) {
        console.error("User Verify OTP Error:", error.message);
        res.status(500).json({ success: false, message: "Verification failed" });
    }
};


exports.updateProfile = async (req, res) => {
    try {
        const { name, email, gender, dateOfBirth, timeOfBirth, placeOfBirth } = req.body;

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Update details
        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email;
        if (gender !== undefined) user.gender = gender;
        if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
        if (timeOfBirth !== undefined) user.timeOfBirth = timeOfBirth;
        if (placeOfBirth !== undefined) user.placeOfBirth = placeOfBirth;

        if (req.file) {
            user.profileImage = req.file.filename;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile details updated successfully",
            user,
        });
    } catch (error) {
        console.error("User Update Profile Error:", error.message);
        // Handle Mongoose duplicate key error for email
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Email is already in use by another user" });
        }
        res.status(500).json({ success: false, message: "Failed to update profile details" });
    }
};

// =========================================================
// ADMIN & SUPER ADMIN USER MANAGEMENT APIs
// =========================================================

// @desc    Get All Users
// @route   GET /api/user
// @access  Private (Admins and Super Admins)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: users.length,
            users,
        });
    } catch (error) {
        console.error("Get All Users Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to get users" });
    }
};

// @desc    Get User By ID
// @route   GET /api/user/:id
// @access  Private (Admins and Super Admins)
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        console.error("Get User By ID Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to get user details" });
    }
};

// @desc    Update User Details
// @route   PUT /api/user/:id
// @access  Private (Admins and Super Admins)
exports.updateUser = async (req, res) => {
    try {
        const { name, phoneNumber, email, walletBalance, gender, dateOfBirth, timeOfBirth, placeOfBirth } = req.body;
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Check if phoneNumber is being changed and is already taken
        if (phoneNumber && phoneNumber !== user.phoneNumber) {
            const phoneExists = await User.findOne({ phoneNumber });
            if (phoneExists) {
                return res.status(400).json({ success: false, message: "Phone number is already in use by another user" });
            }
            user.phoneNumber = phoneNumber;
        }

        // Check if email is being changed and is already taken
        if (email && email.toLowerCase() !== (user.email || "").toLowerCase()) {
            const emailExists = await User.findOne({ email: email.toLowerCase() });
            if (emailExists) {
                return res.status(400).json({ success: false, message: "Email is already in use by another user" });
            }
            user.email = email.toLowerCase();
        }

        if (name !== undefined) user.name = name;
        if (walletBalance !== undefined) user.walletBalance = walletBalance;
        if (gender !== undefined) user.gender = gender;
        if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
        if (timeOfBirth !== undefined) user.timeOfBirth = timeOfBirth;
        if (placeOfBirth !== undefined) user.placeOfBirth = placeOfBirth;

        if (req.file) {
            user.profileImage = req.file.filename;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: "User details updated successfully",
            user,
        });
    } catch (error) {
        console.error("Update User Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update user" });
    }
};

// @desc    Delete User
// @route   DELETE /api/user/:id
// @access  Private (Admins and Super Admins)
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error) {
        console.error("Delete User Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to delete user" });
    }
};

// @desc    Toggle User Active Status (Deactivate / Activate)
// @route   PATCH /api/user/:id/status
// @access  Private (Admins and Super Admins)
exports.toggleUserStatus = async (req, res) => {
    try {
        const { isActive } = req.body;
        
        if (isActive === undefined) {
            return res.status(400).json({ success: false, message: "Please provide isActive status (true/false)" });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.isActive = isActive;
        await user.save();

        res.status(200).json({
            success: true,
            message: `User account has been ${isActive ? "activated" : "deactivated"} successfully`,
            user,
        });
    } catch (error) {
        console.error("Toggle User Status Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update user status" });
    }
};

const Notification = require("../models/Notification");
const Admin = require("../models/Admin");

// =========================================================
// ADMIN & SUPER ADMIN — NOTIFICATION MANAGEMENT APIs
// =========================================================

// @desc    Create / Send a new Notification
// @route   POST /api/notification
// @access  Private (Admin & Super Admin)
exports.createNotification = async (req, res) => {
    try {
        const { title, message, targetAudience, type } = req.body;

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: "Title aur Message dono required hain",
            });
        }

        // 🔒 Normal Admin block - wo 'users' ya 'all' ko nahi bhej sakta (Removed: Now all admins with access can send)

        const notification = await Notification.create({
            title,
            message,
            targetAudience: targetAudience || "all",
            type: type || "general",
            isActive: true,
            createdBy: req.admin._id,
        });

        // Populate admin info
        await notification.populate("createdBy", "name email role");

        res.status(201).json({
            success: true,
            message: "Notification successfully create aur send ho gayi!",
            notification,
        });
    } catch (error) {
        console.error("Create Notification Error:", error.message);
        res.status(500).json({ success: false, message: "Notification create karne mein error aaya" });
    }
};

// @desc    Get All Notifications (Admin View — sab dikhao active + inactive)
// @route   GET /api/notification
// @access  Private (Admin & Super Admin)
exports.getAllNotificationsAdmin = async (req, res) => {
    try {
        const notifications = await Notification.find({})
            .populate("createdBy", "name email role")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: notifications.length,
            notifications,
        });
    } catch (error) {
        console.error("Get All Notifications Error:", error.message);
        res.status(500).json({ success: false, message: "Notifications fetch karne mein error aaya" });
    }
};

// @desc    Get Single Notification by ID
// @route   GET /api/notification/:id
// @access  Private (Admin & Super Admin)
exports.getNotificationById = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id)
            .populate("createdBy", "name email role");

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification nahi mili" });
        }

        res.status(200).json({ success: true, notification });
    } catch (error) {
        console.error("Get Notification By ID Error:", error.message);
        res.status(500).json({ success: false, message: "Notification fetch karne mein error aaya" });
    }
};

// @desc    Edit / Update Notification
// @route   PUT /api/notification/:id
// @access  Private (Admin & Super Admin)
exports.updateNotification = async (req, res) => {
    try {
        const { title, message, targetAudience, type } = req.body;

        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification nahi mili" });
        }

        // 🔒 Normal Admin ko block karo agar wo 'users' ya 'all' me update karna chahe (Removed)

        if (title !== undefined) notification.title = title;
        if (message !== undefined) notification.message = message;
        if (targetAudience !== undefined) notification.targetAudience = targetAudience;
        if (type !== undefined) notification.type = type;

        await notification.save();
        await notification.populate("createdBy", "name email role");

        res.status(200).json({
            success: true,
            message: "Notification successfully update ho gayi!",
            notification,
        });
    } catch (error) {
        console.error("Update Notification Error:", error.message);
        res.status(500).json({ success: false, message: "Notification update karne mein error aaya" });
    }
};

// @desc    Delete Notification
// @route   DELETE /api/notification/:id
// @access  Private (Admin & Super Admin)
exports.deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification nahi mili" });
        }

        await Notification.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Notification successfully delete ho gayi!",
        });
    } catch (error) {
        console.error("Delete Notification Error:", error.message);
        res.status(500).json({ success: false, message: "Notification delete karne mein error aaya" });
    }
};

// @desc    Toggle Notification Active/Inactive Status
// @route   PATCH /api/notification/:id/status
// @access  Private (Admin & Super Admin)
exports.toggleNotificationStatus = async (req, res) => {
    try {
        const { isActive } = req.body;

        if (isActive === undefined) {
            return res.status(400).json({
                success: false,
                message: "isActive field required hai (true ya false)",
            });
        }

        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification nahi mili" });
        }

        notification.isActive = isActive;
        await notification.save();

        res.status(200).json({
            success: true,
            message: `Notification ${isActive ? "Activate" : "Deactivate"} ho gayi!`,
            notification,
        });
    } catch (error) {
        console.error("Toggle Notification Status Error:", error.message);
        res.status(500).json({ success: false, message: "Status update karne mein error aaya" });
    }
};

// =========================================================
// USER (CUSTOMER) — Notifications Dekhne Ki API
// =========================================================

// @desc    Get Active Notifications for Users/Customers
// @route   GET /api/notification/user/feed
// @access  Private (User)
exports.getNotificationsForUser = async (req, res) => {
    try {
        // Sirf active notifications jo "all" ya "users" ke liye hain
        const notifications = await Notification.find({
            isActive: true,
            targetAudience: { $in: ["all", "users"] },
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: notifications.length,
            notifications,
        });
    } catch (error) {
        console.error("Get User Notifications Error:", error.message);
        res.status(500).json({ success: false, message: "Notifications fetch karne mein error aaya" });
    }
};

// =========================================================
// ASTROLOGER — Notifications Dekhne Ki API
// =========================================================

// @desc    Get Active Notifications for Astrologers
// @route   GET /api/notification/astrologer/feed
// @access  Private (Astrologer)
exports.getNotificationsForAstrologer = async (req, res) => {
    try {
        // Fetch notifications matching the target audience
        const notifications = await Notification.find({
            isActive: true,
            targetAudience: { $in: ["all", "astrologers"] },
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: notifications.length,
            notifications,
        });
    } catch (error) {
        console.error("Get Astrologer Notifications Error:", error.message);
        res.status(500).json({ success: false, message: "Notifications fetch karne mein error aaya" });
    }
};

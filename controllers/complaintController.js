const Complaint = require("../models/Complaint");
const Astrologer = require("../models/Astrologer");

// Helper: Check if Normal Admin owns the astrologer who submitted the complaint
const hasComplaintAccess = async (complaint, admin) => {
    if (admin.role === "superadmin") return true;
    if (complaint.submitterType === "user") return false; // Normal admins can't see user complaints

    const astrologer = await Astrologer.findById(complaint.submitterId).select("createdBy");
    return astrologer && astrologer.createdBy?.toString() === admin._id.toString();
};

// =========================================================
// USER — Complaint Submit Karne Ki API
// =========================================================

// @desc    User complaint/support submit kare
// @route   POST /api/complaint/user
// @access  Private (User)
exports.submitComplaintByUser = async (req, res) => {
    try {
        const { subject, message } = req.body;

        if (!subject || !message) {
            return res.status(400).json({
                success: false,
                message: "Subject aur Message dono required hain",
            });
        }

        const complaint = await Complaint.create({
            subject,
            message,
            submitterType: "user",
            submitterId: req.user._id,
            submitterName: req.user.name || "User",
            submitterEmail: req.user.email || "",
            status: "pending",
        });

        res.status(201).json({
            success: true,
            message: "Aapki complaint submit ho gayi! Admin jald hi reply karega.",
            complaint,
        });
    } catch (error) {
        console.error("Submit Complaint (User) Error:", error.message);
        res.status(500).json({ success: false, message: "Complaint submit karne mein error aaya" });
    }
};

// @desc    User apni complaints dekhe
// @route   GET /api/complaint/user/my
// @access  Private (User)
exports.getMyComplaintsByUser = async (req, res) => {
    try {
        const complaints = await Complaint.find({
            submitterId: req.user._id,
            submitterType: "user",
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: complaints.length,
            complaints,
        });
    } catch (error) {
        console.error("Get My Complaints (User) Error:", error.message);
        res.status(500).json({ success: false, message: "Complaints fetch karne mein error aaya" });
    }
};

// =========================================================
// ASTROLOGER — Complaint Submit Karne Ki API
// =========================================================

// @desc    Astrologer complaint/support submit kare
// @route   POST /api/complaint/astrologer
// @access  Private (Astrologer)
exports.submitComplaintByAstrologer = async (req, res) => {
    try {
        const { subject, message } = req.body;

        if (!subject || !message) {
            return res.status(400).json({
                success: false,
                message: "Subject aur Message dono required hain",
            });
        }

        const complaint = await Complaint.create({
            subject,
            message,
            submitterType: "astrologer",
            submitterId: req.astrologer._id,
            submitterName: req.astrologer.name || "Astrologer",
            submitterEmail: req.astrologer.email || "",
            status: "pending",
        });

        res.status(201).json({
            success: true,
            message: "Aapki complaint submit ho gayi! Admin jald hi reply karega.",
            complaint,
        });
    } catch (error) {
        console.error("Submit Complaint (Astrologer) Error:", error.message);
        res.status(500).json({ success: false, message: "Complaint submit karne mein error aaya" });
    }
};

// @desc    Astrologer apni complaints dekhe
// @route   GET /api/complaint/astrologer/my
// @access  Private (Astrologer)
exports.getMyComplaintsByAstrologer = async (req, res) => {
    try {
        const complaints = await Complaint.find({
            submitterId: req.astrologer._id,
            submitterType: "astrologer",
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: complaints.length,
            complaints,
        });
    } catch (error) {
        console.error("Get My Complaints (Astrologer) Error:", error.message);
        res.status(500).json({ success: false, message: "Complaints fetch karne mein error aaya" });
    }
};

// =========================================================
// ADMIN & SUPER ADMIN — Complaint Manage Karne Ki APIs
// =========================================================

// @desc    Sab Complaints dekho (with filters)
// @route   GET /api/complaint
// @access  Private (Admin & Super Admin)
exports.getAllComplaintsAdmin = async (req, res) => {
    try {
        const { status, submitterType } = req.query;
        const isSuperAdmin = req.admin.role === "superadmin";

        // Build filter
        const filter = {};
        if (status) filter.status = status;

        if (!isSuperAdmin) {
            // 🔒 Normal Admin: Sirf apni team ki complaints dekhega
            const myAstrologers = await Astrologer.find({ createdBy: req.admin._id }).select("_id");
            const myAstrologerIds = myAstrologers.map(a => a._id);

            filter.submitterType = "astrologer";
            filter.submitterId = { $in: myAstrologerIds };
        } else {
            // 👑 SuperAdmin: Sab dekhega (optional type filter)
            if (submitterType) filter.submitterType = submitterType;
        }

        const complaints = await Complaint.find(filter)
            .populate("repliedBy", "name email role")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: complaints.length,
            complaints,
        });
    } catch (error) {
        console.error("Get All Complaints (Admin) Error:", error.message);
        res.status(500).json({ success: false, message: "Complaints fetch karne mein error aaya" });
    }
};

// @desc    ID se ek complaint dekho
// @route   GET /api/complaint/:id
// @access  Private (Admin & Super Admin)
exports.getComplaintByIdAdmin = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id)
            .populate("repliedBy", "name email role");

        if (!complaint) {
            return res.status(404).json({ success: false, message: "Complaint nahi mili" });
        }

        // 🔒 Access Check
        const hasAccess = await hasComplaintAccess(complaint, req.admin);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: "Access Denied: Aap sirf apne banaye gaye astrologers ki complaints dekh sakte hain." });
        }

        res.status(200).json({ success: true, complaint });
    } catch (error) {
        console.error("Get Complaint By ID (Admin) Error:", error.message);
        res.status(500).json({ success: false, message: "Complaint fetch karne mein error aaya" });
    }
};

// @desc    Admin Reply kare / Edit reply kare
// @route   PUT /api/complaint/:id/reply
// @access  Private (Admin & Super Admin)
exports.replyToComplaint = async (req, res) => {
    try {
        const { adminReply, status } = req.body;

        if (!adminReply) {
            return res.status(400).json({
                success: false,
                message: "adminReply field required hai",
            });
        }

        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) {
            return res.status(404).json({ success: false, message: "Complaint nahi mili" });
        }

        // 🔒 Access Check
        const hasAccess = await hasComplaintAccess(complaint, req.admin);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: "Access Denied: Aap is complaint ka reply nahi kar sakte." });
        }

        complaint.adminReply = adminReply;
        complaint.repliedBy = req.admin._id;
        complaint.repliedAt = new Date();

        // Status update karo agar diya gaya
        if (status) complaint.status = status;
        else if (complaint.status === "pending") complaint.status = "in_progress";

        await complaint.save();
        await complaint.populate("repliedBy", "name email role");

        res.status(200).json({
            success: true,
            message: "Reply successfully send ho gayi!",
            complaint,
        });
    } catch (error) {
        console.error("Reply to Complaint Error:", error.message);
        res.status(500).json({ success: false, message: "Reply bhejne mein error aaya" });
    }
};

// @desc    Complaint Status Update karo
// @route   PATCH /api/complaint/:id/status
// @access  Private (Admin & Super Admin)
exports.updateComplaintStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status required hai (pending / in_progress / resolved / closed)",
            });
        }

        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) {
            return res.status(404).json({ success: false, message: "Complaint nahi mili" });
        }

        // 🔒 Access Check
        const hasAccess = await hasComplaintAccess(complaint, req.admin);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: "Access Denied: Aap is complaint ka status update nahi kar sakte." });
        }

        complaint.status = status;
        await complaint.save();

        res.status(200).json({
            success: true,
            message: `Complaint status update ho gayi: ${status}`,
            complaint,
        });
    } catch (error) {
        console.error("Update Complaint Status Error:", error.message);
        res.status(500).json({ success: false, message: "Status update karne mein error aaya" });
    }
};

// @desc    Complaint Delete karo
// @route   DELETE /api/complaint/:id
// @access  Private (Admin & Super Admin)
exports.deleteComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) {
            return res.status(404).json({ success: false, message: "Complaint nahi mili" });
        }

        // 🔒 Access Check
        const hasAccess = await hasComplaintAccess(complaint, req.admin);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: "Access Denied: Aap is complaint ko delete nahi kar sakte." });
        }

        await Complaint.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Complaint successfully delete ho gayi!",
        });
    } catch (error) {
        console.error("Delete Complaint Error:", error.message);
        res.status(500).json({ success: false, message: "Complaint delete karne mein error aaya" });
    }
};

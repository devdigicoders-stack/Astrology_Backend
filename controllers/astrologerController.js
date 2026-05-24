const jwt = require("jsonwebtoken");
const Astrologer = require("../models/Astrologer");

// Helper to generate JWT
const generateToken = (id) => {
    return jwt.sign(
        { id, role: "astrologer" },
        process.env.JWT_SECRET || "fallback_secret_key",
        { expiresIn: "30d" }
    );
};

// @desc    Send OTP to Astrologer (Mock)
// @route   POST /api/auth/astrologer/send-otp
// @access  Public
exports.sendOTP = async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ success: false, message: "Phone number is required" });
        }

        // Check if Astrologer exists
        const astrologer = await Astrologer.findOne({ phoneNumber });
        if (!astrologer) {
            return res.status(404).json({
                success: false,
                message: "No astrologer found with this phone number. Please register first.",
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[Astrologer OTP Sent to ${phoneNumber}]: ${otp}`);

        res.status(200).json({
            success: true,
            message: "OTP sent successfully (Check server console or use '123456' for testing)",
            otp: otp, // In development, send OTP back to client
        });
    } catch (error) {
        console.error("Astrologer Send OTP Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to send OTP" });
    }
};

// @desc    Register a new Astrologer (Only Admin can create — self registration band!)
// @route   POST /api/astrologer/register
// @access  Private (Admin & Super Admin only)
exports.registerAstrologer = async (req, res) => {
    try {
        let {
            name,
            phoneNumber,
            email,
            expertise,
            languages,
            experience,
            pricing,
            about,
            bankDetails,
            profilePic,
        } = req.body;

        // Parse JSON strings from FormData if they are strings
        try {
            if (typeof pricing === "string") pricing = JSON.parse(pricing);
            if (typeof expertise === "string") expertise = JSON.parse(expertise);
            if (typeof languages === "string") languages = JSON.parse(languages);
            if (typeof bankDetails === "string") bankDetails = JSON.parse(bankDetails);
        } catch (e) {
            return res.status(400).json({ success: false, message: "Invalid JSON format in Form Data" });
        }

        if (req.file) {
            profilePic = req.file.filename;
        }

        if (!name || !phoneNumber || !email || !pricing) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all required fields (name, phoneNumber, email, pricing)",
            });
        }

        const existingAstrologer = await Astrologer.findOne({
            $or: [{ phoneNumber }, { email }],
        });

        if (existingAstrologer) {
            return res.status(400).json({
                success: false,
                message: "Astrologer with this phone number or email already exists",
            });
        }

        // Inherit global commission percentage from existing astrologers
        const existingAstro = await Astrologer.findOne({}, { commissionPercentage: 1 });
        const defaultCommission = existingAstro ? existingAstro.commissionPercentage : 0;

        const astrologer = await Astrologer.create({
            name,
            phoneNumber,
            email,
            expertise: expertise || [],
            languages: languages || [],
            experience: experience || 0,
            pricing: pricing || {},
            about: about || "",
            profilePic: profilePic || "",
            bankDetails: bankDetails || {},
            commissionPercentage: defaultCommission,
            isVerified: true, // Automatically approved since Admin created it
            createdBy: req.admin._id, // ← Admin ka ID save ho raha hai!
        });

        // Admin info populate karo response mein
        await astrologer.populate("createdBy", "name email role");

        res.status(201).json({
            success: true,
            message: "Astrologer successfully create ho gaya!",
            astrologer,
        });
    } catch (error) {
        console.error("Astrologer Registration Error:", error.message);
        res.status(500).json({ success: false, message: "Registration failed" });
    }
};

// @desc    Verify OTP and Log In Astrologer (Only if verified by Admin)
// @route   POST /api/auth/astrologer/login
// @access  Public
exports.loginAstrologer = async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;

        if (!phoneNumber || !otp) {
            return res.status(400).json({ success: false, message: "Phone number and OTP are required" });
        }

        if (otp !== "123456" && (otp.length !== 6 || isNaN(otp))) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        const astrologer = await Astrologer.findOne({ phoneNumber });

        if (!astrologer) {
            return res.status(404).json({
                success: false,
                message: "No astrologer found with this phone number. Please register first.",
            });
        }

        if (!astrologer.isVerified) {
            return res.status(403).json({
                success: false,
                message: "Your profile is pending admin approval. You cannot login yet.",
            });
        }

        const token = generateToken(astrologer._id);

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            astrologer,
        });
    } catch (error) {
        console.error("Astrologer Login Error:", error.message);
        res.status(500).json({ success: false, message: "Login failed" });
    }
};

// =========================================================
// ADMIN & SUPER ADMIN ASTROLOGER MANAGEMENT APIs
// =========================================================

// @desc    Get All Astrologers
// @route   GET /api/astrologer
// @access  Private (Admins and Super Admins)
exports.getAllAstrologers = async (req, res) => {
    try {
        const isSuperAdmin = req.admin.role === "superadmin";

        // SuperAdmin → sab dikhao | Normal Admin → sirf apni
        const filter = isSuperAdmin ? {} : { createdBy: req.admin._id };

        const astrologers = await Astrologer.find(filter)
            .populate("createdBy", "name email role")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: astrologers.length,
            astrologers,
        });
    } catch (error) {
        console.error("Get All Astrologers Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to get astrologers" });
    }
};

// @desc    Get Astrologer By ID
// @route   GET /api/astrologer/:id
// @access  Private (Admins and Super Admins)
exports.getAstrologerById = async (req, res) => {
    try {
        const astrologer = await Astrologer.findById(req.params.id)
            .populate("createdBy", "name email role");
        if (!astrologer) {
            return res.status(404).json({ success: false, message: "Astrologer not found" });
        }

        // Normal Admin → sirf apni astrologer dekh sakta hai
        const isSuperAdmin = req.admin.role === "superadmin";
        if (!isSuperAdmin && astrologer.createdBy?._id?.toString() !== req.admin._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Access Denied: Ye astrologer aapne create nahi ki hai",
            });
        }

        res.status(200).json({ success: true, astrologer });
    } catch (error) {
        console.error("Get Astrologer By ID Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to get astrologer details" });
    }
};

// @desc    Update Astrologer Details
// @route   PUT /api/astrologer/:id
// @access  Private (Admins and Super Admins)
exports.updateAstrologer = async (req, res) => {
    try {
        let {
            name,
            phoneNumber,
            email,
            expertise,
            languages,
            experience,
            pricing,
            isVerified,
            availability,
            profilePic,
            about,
            bankDetails,
            walletBalance,
        } = req.body;

        // Parse JSON strings from FormData if they are strings
        try {
            if (typeof pricing === "string") pricing = JSON.parse(pricing);
            if (typeof expertise === "string") expertise = JSON.parse(expertise);
            if (typeof languages === "string") languages = JSON.parse(languages);
            if (typeof bankDetails === "string") bankDetails = JSON.parse(bankDetails);
        } catch (e) {
            return res.status(400).json({ success: false, message: "Invalid JSON format in Form Data" });
        }

        if (req.file) {
            profilePic = req.file.filename;
        }

        const astrologer = await Astrologer.findById(req.params.id);
        if (!astrologer) {
            return res.status(404).json({ success: false, message: "Astrologer not found" });
        }

        // Normal Admin → sirf apni astrologer update kar sakta hai
        const isSuperAdmin = req.admin.role === "superadmin";
        if (!isSuperAdmin && astrologer.createdBy?.toString() !== req.admin._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Access Denied: Ye astrologer aapne create nahi ki hai",
            });
        }

        // Check unique phoneNumber constraint
        if (phoneNumber && phoneNumber !== astrologer.phoneNumber) {
            const phoneExists = await Astrologer.findOne({ phoneNumber });
            if (phoneExists) {
                return res.status(400).json({ success: false, message: "Phone number is already in use by another astrologer" });
            }
            astrologer.phoneNumber = phoneNumber;
        }

        // Check unique email constraint
        if (email && email.toLowerCase() !== astrologer.email.toLowerCase()) {
            const emailExists = await Astrologer.findOne({ email: email.toLowerCase() });
            if (emailExists) {
                return res.status(400).json({ success: false, message: "Email is already in use by another astrologer" });
            }
            astrologer.email = email.toLowerCase();
        }

        if (name !== undefined) astrologer.name = name;
        if (expertise !== undefined) astrologer.expertise = expertise;
        if (languages !== undefined) astrologer.languages = languages;
        if (experience !== undefined) astrologer.experience = experience;
        if (pricing !== undefined) {
            astrologer.pricing = {
                ...astrologer.pricing,
                ...pricing
            };
        }
        if (isVerified !== undefined) astrologer.isVerified = isVerified;
        if (availability !== undefined) astrologer.availability = availability;
        if (profilePic !== undefined) astrologer.profilePic = profilePic;
        if (about !== undefined) astrologer.about = about;
        if (walletBalance !== undefined) astrologer.walletBalance = walletBalance;

        // Update nested bankDetails if provided
        if (bankDetails !== undefined) {
            astrologer.bankDetails = {
                ...astrologer.bankDetails,
                ...bankDetails,
            };
        }

        await astrologer.save();

        res.status(200).json({
            success: true,
            message: "Astrologer details updated successfully",
            astrologer,
        });
    } catch (error) {
        console.error("Update Astrologer Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update astrologer" });
    }
};

// @desc    Toggle Astrologer Verification/Approval Status
// @route   PATCH /api/astrologer/:id/verify
// @access  Private (Admins and Super Admins)
exports.toggleAstrologerVerification = async (req, res) => {
    try {
        const { isVerified } = req.body;

        if (isVerified === undefined) {
            return res.status(400).json({ success: false, message: "Please provide isVerified status (true/false)" });
        }

        const astrologer = await Astrologer.findById(req.params.id);
        if (!astrologer) {
            return res.status(404).json({ success: false, message: "Astrologer not found" });
        }

        // Normal Admin → sirf apni astrologer verify kar sakta hai
        const isSuperAdmin = req.admin.role === "superadmin";
        if (!isSuperAdmin && astrologer.createdBy?.toString() !== req.admin._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Access Denied: Ye astrologer aapne create nahi ki hai",
            });
        }

        astrologer.isVerified = isVerified;
        await astrologer.save();

        res.status(200).json({
            success: true,
            message: `Astrologer verification status has been updated to ${isVerified ? "Approved" : "Pending Approval"} successfully`,
            astrologer,
        });
    } catch (error) {
        console.error("Toggle Astrologer Verification Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update verification status" });
    }
};

// @desc    Delete Astrologer
// @route   DELETE /api/astrologer/:id
// @access  Private (Admins and Super Admins)
exports.deleteAstrologer = async (req, res) => {
    try {
        const astrologer = await Astrologer.findById(req.params.id);
        if (!astrologer) {
            return res.status(404).json({ success: false, message: "Astrologer not found" });
        }

        // Normal Admin → sirf apni astrologer delete kar sakta hai
        const isSuperAdmin = req.admin.role === "superadmin";
        if (!isSuperAdmin && astrologer.createdBy?.toString() !== req.admin._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Access Denied: Ye astrologer aapne create nahi ki hai",
            });
        }

        await Astrologer.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Astrologer deleted successfully",
        });
    } catch (error) {
        console.error("Delete Astrologer Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to delete astrologer" });
    }
};

// @desc    Set Global Astrologer Commission Percentage
// @route   PATCH /api/astrologer/commission
// @access  Private (Super Admin: hamesha | Admin: sirf tab jab SuperAdmin ne set nahi kiya)
exports.setGlobalAstrologerCommission = async (req, res) => {
    try {
        const { commissionPercentage } = req.body;

        if (commissionPercentage === undefined || typeof commissionPercentage !== "number") {
            return res.status(400).json({ success: false, message: "Please provide a valid numeric commissionPercentage" });
        }

        if (commissionPercentage < 0 || commissionPercentage > 100) {
            return res.status(400).json({ success: false, message: "Commission percentage must be between 0 and 100" });
        }

        const isSuperAdmin = req.admin.role === "superadmin";

        // Agar Normal Admin hai toh check karo — SuperAdmin ne pehle se set kiya hai?
        if (!isSuperAdmin) {
            const lockedAstrologer = await Astrologer.findOne({ commissionSetBySuperAdmin: true });
            if (lockedAstrologer) {
                return res.status(403).json({
                    success: false,
                    message: "Commission Super Admin dwara set ki ja chuki hai. Sirf Super Admin ise change kar sakta hai.",
                });
            }
        }

        // SuperAdmin → commissionSetBySuperAdmin = true
        // Normal Admin → commissionSetBySuperAdmin = false (unchanged agar nahi set tha)
        const updateData = isSuperAdmin
            ? { commissionPercentage, commissionSetBySuperAdmin: true }
            : { commissionPercentage };

        const result = await Astrologer.updateMany({}, updateData);

        res.status(200).json({
            success: true,
            message: `Global commission percentage set to ${commissionPercentage}% for all astrologers${isSuperAdmin ? " (Locked by Super Admin)" : ""}`,
            setBy: isSuperAdmin ? "superadmin" : "admin",
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        console.error("Set Global Astrologer Commission Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update global commission percentage" });
    }
};

// =========================================================
// ASTROLOGER ROUTES
// =========================================================

// @desc    Update Astrologer Availability (online/offline/busy)
// @route   PATCH /api/astrologer/status
// @access  Private (Astrologer)
exports.updateAvailabilityStatus = async (req, res) => {
    try {
        const { availability } = req.body;
        
        if (!['online', 'offline', 'busy'].includes(availability)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid status. Allowed values: online, offline, busy" 
            });
        }

        const astrologer = await Astrologer.findById(req.astrologer._id);
        if (!astrologer) {
            return res.status(404).json({ success: false, message: "Astrologer not found" });
        }

        astrologer.availability = availability;
        await astrologer.save();

        res.status(200).json({
            success: true,
            message: `Aapka status ab '${availability}' ho gaya hai!`,
            availability: astrologer.availability
        });
    } catch (error) {
        console.error("Update Availability Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update availability status" });
    }
};

// =========================================================
// CUSTOMER PUBLIC ROUTES (Search & Filter Astrologers)
// =========================================================

// @desc    Get All Active, Verified & Online Astrologers (For Customers)
// @route   GET /api/astrologer/public
// @access  Public
exports.getPublicAstrologers = async (req, res) => {
    try {
        // Query Object: Start with only verified AND ONLY ONLINE astrologers
        let query = { isVerified: true, availability: "online" };

        // 1. Filter by Expertise (Vedic, Tarot, etc.)
        if (req.query.expertise) {
            // Case-insensitive exact match in the array
            query.expertise = { $regex: new RegExp("^" + req.query.expertise + "$", "i") };
        }

        // 2. Filter by Language (Hindi, English, etc.)
        if (req.query.language) {
            query.languages = { $regex: new RegExp("^" + req.query.language + "$", "i") };
        }

        // 3. Filter by Minimum Experience (e.g., ?minExperience=5)
        if (req.query.minExperience) {
            query.experience = { $gte: Number(req.query.minExperience) };
        }

        // 4. Filter by Maximum Charge / Budget (e.g., ?maxCharge=20)
        if (req.query.maxCharge) {
            query["pricing.chatRate"] = { $lte: Number(req.query.maxCharge) };
        }

        // 3. Removed status filter since we strictly only show "online" now.

        // Fetch astrologers excluding secret fields (like bank details, commission, createdBy, walletBalance)
        const astrologers = await Astrologer.find(query)
            .select("-bankDetails -commissionPercentage -commissionSetBySuperAdmin -createdBy -password -walletBalance")
            .sort({ "pricing.chatRate": 1 }); // Default sort by price low to high, or you can sort by rating

        res.status(200).json({
            success: true,
            count: astrologers.length,
            astrologers,
        });
    } catch (error) {
        console.error("Get Public Astrologers Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch astrologers" });
    }
};

// @desc    Get Single Astrologer Profile (For Customers - Must be Online)
// @route   GET /api/astrologer/public/:id
// @access  Public
exports.getPublicAstrologerById = async (req, res) => {
    try {
        const astrologer = await Astrologer.findOne({ _id: req.params.id, isVerified: true, availability: "online" })
            .select("-bankDetails -commissionPercentage -commissionSetBySuperAdmin -createdBy -password -walletBalance");

        if (!astrologer) {
            return res.status(404).json({ success: false, message: "Astrologer not found or not active" });
        }

        res.status(200).json({
            success: true,
            astrologer,
        });
    } catch (error) {
        console.error("Get Public Astrologer By ID Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch astrologer details" });
    }
};

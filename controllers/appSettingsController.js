const AppSettings = require("../models/AppSettings");

// @desc    Get global app settings
// @route   GET /api/admin/settings
// @access  Private (Admin/Superadmin)
exports.getSettings = async (req, res) => {
    try {
        let settings = await AppSettings.findOne();
        if (!settings) {
            settings = await AppSettings.create({ kundaliRate: 10, aiChatRate: 5 });
        }
        res.status(200).json({ success: true, settings });
    } catch (error) {
        console.error("Error in getSettings:", error);
        res.status(500).json({ success: false, message: "Failed to get settings" });
    }
};

// @desc    Update global app settings
// @route   PUT /api/admin/settings
// @access  Private (Superadmin only)
exports.updateSettings = async (req, res) => {
    try {
        const { kundaliRate, aiChatRate } = req.body;
        
        let settings = await AppSettings.findOne();
        if (!settings) {
            settings = await AppSettings.create({ kundaliRate: 10, aiChatRate: 5 });
        }

        if (kundaliRate !== undefined) {
            settings.kundaliRate = kundaliRate;
        }
        
        if (aiChatRate !== undefined) {
            settings.aiChatRate = aiChatRate;
        }

        await settings.save();
        res.status(200).json({ success: true, message: "Settings updated successfully", settings });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update settings" });
    }
};

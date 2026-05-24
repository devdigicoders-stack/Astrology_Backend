const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { protectUser, protectAstrologer, protectAdmin } = require("../middleware/authMiddleware");

// Custom middleware to allow either User OR Astrologer (or Admin) to access the route
const protectAnyParticipant = (req, res, next) => {
    // Try user auth first
    protectUser(req, res, (err) => {
        if (!err && req.user) return next();
        
        // If not user, try astrologer auth
        protectAstrologer(req, res, (err2) => {
            if (!err2 && req.astrologer) return next();
            
            // Try admin auth as fallback
            protectAdmin(req, res, (err3) => {
                if (!err3 && req.admin) return next();
                
                return res.status(401).json({ success: false, message: "Not authorized to access chat routes" });
            });
        });
    });
};

router.get("/:callId", protectAnyParticipant, chatController.getChatMessages);
router.post("/send", protectAnyParticipant, chatController.sendMessage);

module.exports = router;

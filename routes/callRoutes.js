const express = require("express");
const router = express.Router();
const callController = require("../controllers/callController");
const { protectUser, protectAstrologer, protectAdmin, authorizeRoles } = require("../middleware/authMiddleware");

// Custom middleware to allow either User OR Astrologer (or Admin) to access the route
const protectAnyParticipant = (req, res, next) => {
    protectUser(req, res, (err) => {
        if (!err && req.user) return next();
        protectAstrologer(req, res, (err2) => {
            if (!err2 && req.astrologer) return next();
            protectAdmin(req, res, (err3) => {
                if (!err3 && req.admin) return next();
                return res.status(401).json({ success: false, message: "Not authorized" });
            });
        });
    });
};

router.post("/initiate", protectUser, callController.initiateCall);
router.post("/end", protectAnyParticipant, callController.endCall);
router.post("/accept", protectAstrologer, callController.acceptCall);
router.post("/reject", protectAstrologer, callController.rejectCall);

router.get("/user", protectUser, callController.getUserCallHistory);
router.get("/astrologer/pending", protectAstrologer, callController.getPendingCalls);
router.get("/astrologer", protectAstrologer, callController.getAstrologerCallHistory);
router.get("/admin", protectAdmin, authorizeRoles("superadmin"), callController.getAllCallHistory);

router.get("/:id", callController.getCallById);

router.get("/:id/agora-token", protectAnyParticipant, callController.generateAgoraToken);

module.exports = router;

const CallHistory = require("../models/CallHistory");
const User = require("../models/User");
const Astrologer = require("../models/Astrologer");
const { finishCall } = require("../sockets/callHandler");
const { RtcTokenBuilder, RtcRole } = require('agora-token');

// @desc    Initiate a new call (Button click from User App)
// @route   POST /api/calls/initiate
// @access  Private (User)
exports.initiateCall = async (req, res) => {
    try {
        const { astrologerId, type } = req.body; // type: 'chat', 'audio', 'video'
        
        if (!["chat", "audio", "video"].includes(type)) {
            return res.status(400).json({ success: false, message: "Invalid call type" });
        }

        const user = await User.findById(req.user._id);
        const astrologer = await Astrologer.findById(astrologerId);

        if (!user || !astrologer) {
            return res.status(404).json({ success: false, message: "User or Astrologer not found" });
        }

        // Check if Astrologer is currently available
        if (astrologer.availability !== "online") {
            return res.status(400).json({ success: false, message: "Astrologer is currently busy or offline" });
        }

        // Determine rate
        let perMinuteRate = 0;
        if (type === "chat") perMinuteRate = astrologer.pricing.chatRate || 0;
        else if (type === "audio") perMinuteRate = astrologer.pricing.audioCallRate || 0;
        else if (type === "video") perMinuteRate = astrologer.pricing.videoCallRate || 0;

        // Check user balance (Must have at least 5 minutes worth of balance)
        const requiredBalance = perMinuteRate * 5;
        if (!user.isFirstCallFree && user.walletBalance < requiredBalance && perMinuteRate > 0) {
            return res.status(400).json({ success: false, message: `Insufficient wallet balance. You need at least ₹${requiredBalance} for a 5-minute call.` });
        }

        // Create the initial Call History record (Status: Pending)
        const callRecord = await CallHistory.create({
            user: user._id,
            astrologer: astrologer._id,
            type: type,
            status: "pending",
        });

        // Mark Astrologer as busy so others can't call them at the same time
        // Actually, we don't mark them busy until they accept.

        // Send the ring signal to Astrologer via Socket.io
        const io = req.app.get("io");
        io.to(astrologer._id.toString()).emit("incoming_call_request", {
            callId: callRecord._id,
            user: user.name,
            type: type
        });

        // Auto-Reject Logic (If Astrologer doesn't accept in 60 seconds)
        setTimeout(async () => {
            const checkCall = await CallHistory.findById(callRecord._id);
            if (checkCall && checkCall.status === "pending") {
                checkCall.status = "rejected";
                await checkCall.save();
                io.to(user._id.toString()).emit("call_rejected", { message: "Astrologer did not answer. Call rejected." });
            }
        }, 60000); // 60 seconds

        res.status(200).json({
            success: true,
            message: "Call initiated. Ringing astrologer...",
            callId: callRecord._id,
            type: type
        });

    } catch (error) {
        console.error("Initiate Call Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to initiate call" });
    }
};

// @desc    Accept a call (Astrologer)
// @route   POST /api/calls/accept
// @access  Private (Astrologer)
exports.acceptCall = async (req, res) => {
    try {
        const { callId } = req.body;
        const callRecord = await CallHistory.findById(callId);

        if (!callRecord || callRecord.status !== "pending") {
            return res.status(400).json({ success: false, message: "Call request is no longer valid or already answered." });
        }

        // Verify it belongs to this astrologer
        if (callRecord.astrologer.toString() !== req.astrologer._id.toString()) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        // Update status
        callRecord.status = "ongoing";
        await callRecord.save();

        // Mark astrologer as busy
        const astrologer = await Astrologer.findById(req.astrologer._id);
        astrologer.availability = "busy";
        await astrologer.save();

        // Inform user via WebSocket that call is accepted
        const io = req.app.get("io");
        io.to(callRecord.user.toString()).emit("call_accepted", { callId: callRecord._id, type: callRecord.type, message: "Astrologer accepted! Connected." });

        // NOTE: The frontend should now tell socket server to start the timer by calling the start_timer event.

        res.status(200).json({ success: true, message: "Call accepted successfully" });
    } catch (error) {
        console.error("Accept Call Error:", error);
        res.status(500).json({ success: false, message: "Failed to accept call" });
    }
};

// @desc    Reject a call (Astrologer)
// @route   POST /api/calls/reject
// @access  Private (Astrologer)
exports.rejectCall = async (req, res) => {
    try {
        const { callId } = req.body;
        const callRecord = await CallHistory.findById(callId);

        if (!callRecord || callRecord.status !== "pending") {
            return res.status(400).json({ success: false, message: "Call request is no longer valid." });
        }

        if (callRecord.astrologer.toString() !== req.astrologer._id.toString()) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        callRecord.status = "rejected";
        await callRecord.save();

        // Inform user via WebSocket that call is rejected
        const io = req.app.get("io");
        io.to(callRecord.user.toString()).emit("call_rejected", { message: "Astrologer rejected the call." });

        res.status(200).json({ success: true, message: "Call rejected successfully" });
    } catch (error) {
        console.error("Reject Call Error:", error);
        res.status(500).json({ success: false, message: "Failed to reject call" });
    }
};

// @desc    End an ongoing call manually (User or Astrologer)
// @route   POST /api/calls/end
// @access  Private (User or Astrologer)
exports.endCall = async (req, res) => {
    try {
        const { callId } = req.body;

        if (!callId) {
            return res.status(400).json({ success: false, message: "Please provide callId" });
        }

        const callRecord = await CallHistory.findById(callId);
        if (!callRecord) {
            return res.status(404).json({ success: false, message: "Call not found" });
        }

        // Allow only if call is ongoing
        if (callRecord.status !== "ongoing") {
            return res.status(400).json({ success: false, message: "Call is not ongoing" });
        }

        // Verify that the person ending the call is either the User or Astrologer involved
        let isParticipant = false;
        if (req.user && callRecord.user.toString() === req.user._id.toString()) {
            isParticipant = true;
        } else if (req.astrologer && callRecord.astrologer.toString() === req.astrologer._id.toString()) {
            isParticipant = true;
        } else if (req.admin) {
            isParticipant = true; // Admin can force end
        }

        if (!isParticipant) {
            return res.status(403).json({ success: false, message: "You are not part of this call" });
        }

        // Invoke the finishCall logic from socketHandler to clear the timer, update DB, and notify via Socket
        const io = req.app.get("io");
        await finishCall(callId, "completed", io);

        res.status(200).json({ success: true, message: "Call ended successfully" });
    } catch (error) {
        console.error("End Call Error:", error);
        res.status(500).json({ success: false, message: "Failed to end call" });
    }
};

// @desc    Get user call history
// @route   GET /api/calls/user
// @access  Private (User)
exports.getUserCallHistory = async (req, res) => {
    try {
        const calls = await CallHistory.find({ user: req.user._id })
            .populate("astrologer", "name profilePic")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: calls.length, calls });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch user call history" });
    }
};

// @desc    Get astrologer call history
// @route   GET /api/calls/astrologer
// @access  Private (Astrologer)
exports.getAstrologerCallHistory = async (req, res) => {
    try {
        const calls = await CallHistory.find({ astrologer: req.astrologer._id })
            .populate("user", "name profilePic")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: calls.length, calls });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch astrologer call history" });
    }
};

// @desc    Get incoming/pending calls for Astrologer
// @route   GET /api/calls/pending
// @access  Private (Astrologer)
exports.getPendingCalls = async (req, res) => {
    try {
        // Fetch only 'pending' calls for this astrologer
        const calls = await CallHistory.find({ 
            astrologer: req.astrologer._id,
            status: "pending" 
        }).populate("user", "name profilePic");

        res.status(200).json({ success: true, count: calls.length, calls });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch pending calls" });
    }
};

// @desc    Get specific call details by ID
// @route   GET /api/calls/:id
// @access  Private
exports.getCallById = async (req, res) => {
    try {
        const call = await CallHistory.findById(req.params.id)
            .populate("user", "name profilePic phoneNumber")
            .populate("astrologer", "name profilePic");

        if (!call) {
            return res.status(404).json({ success: false, message: "Call not found" });
        }

        res.status(200).json({ success: true, call });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch call details" });
    }
};

// @desc    Get all call history (Admin)
// @route   GET /api/calls/admin
// @access  Private (Admin & SuperAdmin)
exports.getAllCallHistory = async (req, res) => {
    try {
        let query = {};

        const calls = await CallHistory.find(query)
            .populate("user", "name")
            .populate("astrologer", "name")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: calls.length, calls });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch all call history" });
    }
};

// @desc    Generate Agora Token for a specific call
// @route   GET /api/calls/:id/agora-token
// @access  Private (User or Astrologer)
exports.generateAgoraToken = async (req, res) => {
    try {
        const callId = req.params.id;
        const callRecord = await CallHistory.findById(callId);

        if (!callRecord) {
            return res.status(404).json({ success: false, message: "Call not found" });
        }

        // Verify that the person requesting is part of the call
        let isParticipant = false;
        let accountId = "";

        if (req.user && callRecord.user.toString() === req.user._id.toString()) {
            isParticipant = true;
            accountId = req.user._id.toString();
        } else if (req.astrologer && callRecord.astrologer.toString() === req.astrologer._id.toString()) {
            isParticipant = true;
            accountId = req.astrologer._id.toString();
        }

        if (!isParticipant) {
            return res.status(403).json({ success: false, message: "You are not authorized to join this call" });
        }

        const appId = process.env.AGORA_APP_ID;
        const appCertificate = process.env.AGORA_APP_CERTIFICATE;

        if (!appId || !appCertificate) {
            return res.status(500).json({ success: false, message: "Agora credentials not configured on server" });
        }

        const channelName = callId.toString();
        // Set role to Publisher for both User and Astrologer
        const role = RtcRole.PUBLISHER;
        const expirationTimeInSeconds = 3600 * 2; // Token valid for 2 hours
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        // Generate token
        const token = RtcTokenBuilder.buildTokenWithUserAccount(
            appId,
            appCertificate,
            channelName,
            accountId,
            role,
            privilegeExpiredTs
        );

        res.status(200).json({
            success: true,
            token,
            channelName,
            accountId
        });

    } catch (error) {
        console.error("Generate Agora Token Error:", error);
        res.status(500).json({ success: false, message: "Failed to generate token" });
    }
};

// @desc    Delete a call history record (Admin)
// @route   DELETE /api/calls/admin/:id
// @access  Private (Admin)
exports.deleteCallHistory = async (req, res) => {
    try {
        const call = await CallHistory.findById(req.params.id);

        if (!call) {
            return res.status(404).json({ success: false, message: "Call history not found" });
        }

        await call.deleteOne();

        res.status(200).json({ success: true, message: "Call history deleted successfully" });
    } catch (error) {
        console.error("Delete Call History Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete call history" });
    }
};

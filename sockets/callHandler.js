const CallHistory = require("../models/CallHistory");
const ChatMessage = require("../models/ChatMessage");
const User = require("../models/User");
const Astrologer = require("../models/Astrologer");
const Admin = require("../models/Admin");
const { saveTransaction } = require("../controllers/transactionController");

// A map to store active call timers so we can clear them easily
const activeCalls = new Map();

exports.initSocket = (io) => {
    // Middleware to extract user ID from token and attach it to socket
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (token) {
            try {
                const jwt = require("jsonwebtoken");
                const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_key");
                socket.userId = decoded.id;
                console.log("Socket Auth Success: User ID extracted:", socket.userId);
            } catch (err) {
                console.log("Socket JWT Verification Error:", err.message);
            }
        }
        next();
    });

    io.on("connection", (socket) => {
        console.log("New client connected to Socket.io:", socket.id);

        // Auto-join room using decoded userId
        if (socket.userId) {
            socket.join(socket.userId);
            console.log(`[SOCKET SUCCESS] User/Astrologer ${socket.userId} auto-joined their personal room.`);
        } else {
            console.log(`[SOCKET WARNING] Client connected without a valid userId. They won't receive private events.`);
        }

        // Client can optionally join a room using their user/astrologer ID manually
        socket.on("join_room", (userId) => {
            socket.join(userId);
            console.log(`User/Astrologer ${userId} joined room`);
        });

        // 1. Start Timer Event (Called by frontend AFTER API accept returns success)
        socket.on("start_timer", async (data) => {
            const { callId } = data;
            console.log("start_timer received for call:", callId);

            try {
                if (!callId) {
                    console.log("start_timer error: No callId provided");
                    return;
                }

                // Check if timer already exists for this call to avoid duplicate timers!
                if (activeCalls.has(callId.toString())) {
                    console.log("Timer already running for call:", callId);
                    return;
                }

                // Fetch the call record
                const callRecord = await CallHistory.findById(callId);
                if (!callRecord) {
                    console.log("start_timer error: Call not found");
                    return socket.emit("call_error", { message: "Call not found." });
                }
                if (callRecord.status !== "ongoing") {
                    console.log("start_timer error: Call status is not ongoing, it is:", callRecord.status);
                    return socket.emit("call_error", { message: "Call is not ongoing. Please accept via API first." });
                }

                // Fetch user and astrologer
                const user = await User.findById(callRecord.user);
                const astrologer = await Astrologer.findById(callRecord.astrologer);

                if (!user || !astrologer) {
                    return socket.emit("call_error", { message: "Invalid user or astrologer" });
                }

                // Get per minute rate based on call type safely
                const type = callRecord.type;
                let perMinuteRate = 0;
                if (astrologer.pricing) {
                    if (type === "chat") perMinuteRate = astrologer.pricing.chatRate || 0;
                    else if (type === "audio") perMinuteRate = astrologer.pricing.audioCallRate || 0;
                    else if (type === "video") perMinuteRate = astrologer.pricing.videoCallRate || 0;
                }

                // Create a room for this call so both can join
                const roomName = `call_${callRecord._id}`;
                socket.join(roomName);

                // Inform clients that timer started
                io.to(roomName).emit("timer_started", { message: "Live billing timer started." });

                // DEDUCT FOR THE 1ST MINUTE IMMEDIATELY (At the start of the minute)
                await handleMinuteTick(callRecord._id, user._id, astrologer._id, perMinuteRate, io);

                // 2. Start Timer (Every 60 seconds for subsequent minutes)
                const timerId = setInterval(async () => {
                    await handleMinuteTick(callRecord._id, user._id, astrologer._id, perMinuteRate, io);
                }, 60000); // 60,000 ms = 1 minute

                activeCalls.set(callRecord._id.toString(), timerId);
                console.log("Timer successfully started for call:", callId);

            } catch (error) {
                console.error("Start Timer Socket Error:", error);
                socket.emit("call_error", { message: "Internal server error starting call timer" });
            }
        });

        // Removed socket.on("end_call") since it is now an API route

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
            // Ideally handle sudden disconnects if they are in an active call
        });
    });
};

// Function to handle the per-minute deduction logic
async function handleMinuteTick(callId, userId, astrologerId, perMinuteRate, io) {
    const userRoom = userId.toString();
    const astroRoom = astrologerId.toString();

    try {
        const user = await User.findById(userId);
        const astrologer = await Astrologer.findById(astrologerId);
        const superAdmin = await Admin.findOne({ role: "superadmin" });
        const callRecord = await CallHistory.findById(callId);

        if (!user || !astrologer || !callRecord || callRecord.status !== "ongoing") {
            return await finishCall(callId, "completed", io);
        }

        // Handle Free Call logic (e.g., first 5 minutes free)
        let deductionAmount = perMinuteRate;
        if (user.isFirstCallFree && callRecord.totalDurationMinutes < 5) {
            deductionAmount = 0; // It's free!
            // If they reach 5 mins, next minute will be charged, so maybe remove flag?
            // Optionally, remove flag immediately after call ends
        }

        // Deduct money if it's not a free minute
        if (deductionAmount > 0) {
            if (user.walletBalance < deductionAmount) {
                // Insufficient funds, disconnect the call immediately
                io.to(userRoom).emit("force_disconnect", { message: "Insufficient balance. Call ended." });
                io.to(astroRoom).emit("force_disconnect", { message: "User balance empty. Call ended." });
                return await finishCall(callId, "disconnected", io);
            }

            // Deduct from User
            const balanceBefore = user.walletBalance;
            user.walletBalance -= deductionAmount;
            await user.save();


            // Distribute to Astrologer and SuperAdmin
            const commissionPercent = astrologer.commissionPercentage || 0;
            const superAdminShare = (deductionAmount * commissionPercent) / 100;
            const astrologerShare = deductionAmount - superAdminShare;

            astrologer.walletBalance += astrologerShare;
            await astrologer.save();

            if (superAdmin) {
                superAdmin.walletBalance += superAdminShare;
                await superAdmin.save();
            }

            // Update Call Record totals
            callRecord.totalCost += deductionAmount;
            callRecord.astrologerEarnings += astrologerShare;
            callRecord.superAdminEarnings += superAdminShare;
        }

        // Increment duration
        callRecord.totalDurationMinutes += 1;
        await callRecord.save();

        // Send low balance warning if user has only 1 minute left
        if (user.walletBalance >= 0 && user.walletBalance < (perMinuteRate * 2) && deductionAmount > 0) {
            io.to(userRoom).emit("low_balance_warning", { message: "Low balance. Call will disconnect soon." });
        }

        // Update live balance on frontend
        io.to(userRoom).emit("balance_update", { walletBalance: user.walletBalance });

    } catch (error) {
        console.error("Minute Tick Error:", error);
    }
}

// Function to safely close a call and stop the timer
const finishCall = async (callId, status, io) => {
    try {
        const timerId = activeCalls.get(callId.toString());
        if (timerId) {
            clearInterval(timerId);
            activeCalls.delete(callId.toString());
        }

        const callRecord = await CallHistory.findById(callId).populate("astrologer");
        if (callRecord && callRecord.status === "ongoing") {
            callRecord.status = status;
            callRecord.endTime = Date.now();
            await callRecord.save();

            // Save ONE consolidated transaction record for the entire call
            if (callRecord.totalCost > 0) {
                const user = await User.findById(callRecord.user);
                if (user) {
                    await saveTransaction({
                        userId: user._id,
                        type: "call_deduction",
                        amount: callRecord.totalCost,
                        direction: "debit",
                        balanceBefore: user.walletBalance + callRecord.totalCost,
                        balanceAfter: user.walletBalance,
                        description: `${callRecord.type.charAt(0).toUpperCase() + callRecord.type.slice(1)} call charge — ${callRecord.totalDurationMinutes} min total`,
                        callId: callRecord._id,
                        doneBy: "system",
                    });
                }
            }

            // Set astrologer back to online
            if (callRecord.astrologer) {
                await Astrologer.findByIdAndUpdate(callRecord.astrologer._id, { availability: "online" });
            }

            // Remove free call flag if it was used
            const user = await User.findById(callRecord.user);
            if (user && user.isFirstCallFree) {
                user.isFirstCallFree = false;
                await user.save();
            }

            io.to(callRecord.user.toString()).emit("call_ended", { message: "Call has ended", totalCost: callRecord.totalCost, duration: callRecord.totalDurationMinutes });
            io.to(callRecord.astrologer._id.toString()).emit("call_ended", { message: "Call has ended", duration: callRecord.totalDurationMinutes });
        }
    } catch (error) {
        console.error("Finish Call Error:", error);
    }
};

exports.finishCall = finishCall;

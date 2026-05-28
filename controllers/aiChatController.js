const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/User");
const AIChatMessage = require("../models/AIChatMessage");
const crypto = require("crypto");

// Initialize Gemini (User must set GEMINI_API_KEY in .env)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_TEST_API_KEY");

const PAID_MESSAGE_PRICE = 5; // e.g., ₹5 per message

exports.chatWithAI = async (req, res) => {
    try {
        const userId = req.user.id;
        let { message, sessionId } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: "Message is required" });
        }
        
        let sessionTitle = undefined;
        if (!sessionId) {
            sessionId = crypto.randomUUID();
            sessionTitle = message.substring(0, 30) + (message.length > 30 ? "..." : "");
        } else {
            // Find existing session title
            const existingMsg = await AIChatMessage.findOne({ sessionId });
            if (existingMsg) {
                sessionTitle = existingMsg.sessionTitle;
            }
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        let isPaid = false;
        let cost = 0;

        // Check Limits
        if (user.freeAIChatLimit > 0) {
            user.freeAIChatLimit -= 1;
            user.usedAIChatCount += 1;
        } else {
            // Free limit over, check wallet
            if (user.walletBalance < PAID_MESSAGE_PRICE) {
                return res.status(402).json({
                    success: false,
                    message: "Insufficient wallet balance. Please recharge to continue talking to AI Astrologer."
                });
            }
            user.walletBalance -= PAID_MESSAGE_PRICE;
            user.usedAIChatCount += 1;
            isPaid = true;
            cost = PAID_MESSAGE_PRICE;
        }

        // Construct User Context from DB
        let userContext = [];
        if (user.name) userContext.push(`Name: ${user.name}`);
        if (user.dateOfBirth) userContext.push(`Date of Birth: ${user.dateOfBirth}`);
        if (user.timeOfBirth) userContext.push(`Time of Birth: ${user.timeOfBirth}`);
        if (user.placeOfBirth) userContext.push(`Place of Birth: ${user.placeOfBirth}`);
        if (user.gender) userContext.push(`Gender: ${user.gender}`);
        const userContextStr = userContext.length > 0 ? `\nUser Profile (Use this for calculations if needed): ${userContext.join(", ")}` : "";

        const systemPrompt = `You are a highly experienced Vedic Astrologer. You provide astrological guidance, horoscope insights, and remedies.${userContextStr}\nPlease respond in a helpful, knowledgeable, and empathetic astrological tone. Keep your response concise (max 3-4 short paragraphs).`;

        let aiResponseText = "";
        try {
            // Fetch last 10 chat messages for history (only for this session)
            const previousChats = await AIChatMessage.find({ user: userId, sessionId: sessionId })
                .sort({ createdAt: 1 })
                .limit(10);
            
            const history = [];
            previousChats.forEach(chat => {
                history.push({ role: "user", parts: [{ text: chat.message }] });
                history.push({ role: "model", parts: [{ text: chat.aiResponse }] });
            });

            const model = genAI.getGenerativeModel({ 
                model: "gemini-2.5-flash",
                systemInstruction: systemPrompt 
            });

            const chatSession = model.startChat({ history: history });
            const result = await chatSession.sendMessage(message);
            aiResponseText = result.response.text();
        } catch (error) {
            console.error("Gemini API Error:", error);
            return res.status(500).json({ success: false, message: "Failed to connect to AI Astrologer." });
        }

        // Save Chat to DB
        const aiChatMessage = new AIChatMessage({
            user: userId,
            sessionId: sessionId,
            sessionTitle: sessionTitle,
            message: message,
            aiResponse: aiResponseText,
            isPaid: isPaid,
            cost: cost
        });
        await aiChatMessage.save();

        // Save user state (limit or wallet deduction)
        await user.save();

        res.status(200).json({
            success: true,
            data: {
                sessionId: sessionId,
                sessionTitle: sessionTitle,
                aiResponse: aiResponseText,
                isPaid: isPaid,
                freeLimitRemaining: user.freeAIChatLimit,
                walletBalanceRemaining: user.walletBalance
            }
        });

    } catch (error) {
        console.error("Error in AI Chat:", error);
        res.status(500).json({ success: false, message: "Server error in AI Chat" });
    }
};

exports.getAIChatHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { sessionId } = req.params;
        
        const filter = { user: userId };
        if (sessionId) {
            filter.sessionId = sessionId;
        }

        const chats = await AIChatMessage.find(filter).sort({ createdAt: 1 });

        res.status(200).json({
            success: true,
            data: chats
        });
    } catch (error) {
        console.error("Error fetching AI Chat history:", error);
        res.status(500).json({ success: false, message: "Server error fetching chat history" });
    }
};

const mongoose = require("mongoose");

exports.getAISessions = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Aggregate to get unique sessions with their title and latest message time
        const sessions = await AIChatMessage.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId) } },
            { 
                $group: { 
                    _id: "$sessionId", 
                    sessionTitle: { $first: "$sessionTitle" },
                    createdAt: { $min: "$createdAt" },
                    updatedAt: { $max: "$createdAt" }
                } 
            },
            { $sort: { updatedAt: -1 } }
        ]);

        res.status(200).json({
            success: true,
            data: sessions
        });
    } catch (error) {
        console.error("Error fetching AI sessions:", error);
        res.status(500).json({ success: false, message: "Server error fetching AI sessions" });
    }
};

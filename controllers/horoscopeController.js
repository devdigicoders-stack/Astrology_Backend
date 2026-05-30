const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/User");
const Admin = require("../models/Admin");
const Transaction = require("../models/Transaction");
const AppSettings = require("../models/AppSettings");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_TEST_API_KEY");

// Helper: Get or create AppSettings
const getSettings = async () => {
    let settings = await AppSettings.findOne();
    if (!settings) {
        settings = await AppSettings.create({ kundaliRate: 10, aiChatRate: 5, dailyHoroscopeRate: 2, weeklyHoroscopeRate: 5 });
    }
    return settings;
};

// Helper: Deduct amount and create transaction
const processPayment = async (user, amount, type, description) => {
    if (user.walletBalance < amount) {
        throw new Error(`Insufficient wallet balance. Required: ₹${amount}, Current: ₹${user.walletBalance}`);
    }

    const userBalanceBefore = user.walletBalance;
    user.walletBalance -= amount;
    await user.save();

    // Credit to Super Admin
    const superAdmin = await Admin.findOne({ role: "superadmin" });
    if (superAdmin) {
        superAdmin.walletBalance = (superAdmin.walletBalance || 0) + amount;
        await superAdmin.save();
    }

    // Record Transaction
    await Transaction.create({
        user: user._id,
        type: type,
        amount: amount,
        direction: "debit",
        balanceBefore: userBalanceBefore,
        balanceAfter: user.walletBalance,
        description: description,
        doneBy: "system"
    });
};

// @desc    Get Personalized Horoscope (Daily or Weekly) - Combined API
// @route   POST /api/horoscope/fetch
// @body    { day, month, year, hour, min, lat, lon, tzone, type: "daily" | "weekly" }
// @access  Private
exports.getHoroscope = async (req, res) => {
    try {
        const { day, month, year, hour, min, lat, lon, tzone, type } = req.body;

        // Validate required fields
        if (!day || !month || !year || !hour || min === undefined || !lat || !lon || !tzone) {
            return res.status(400).json({ success: false, message: "Please provide all required birth details." });
        }

        if (!type || !["daily", "weekly"].includes(type)) {
            return res.status(400).json({ success: false, message: 'Please provide type: "daily" or "weekly".' });
        }

        const user = req.user;
        const settings = await getSettings();

        // Choose rate and transaction type based on "daily" or "weekly"
        const isDaily = type === "daily";
        const rate = isDaily ? settings.dailyHoroscopeRate : settings.weeklyHoroscopeRate;
        const txType = isDaily ? "daily_horoscope" : "weekly_horoscope";
        const txDesc = isDaily ? `Daily Horoscope charge - ₹${rate}` : `Weekly Horoscope charge - ₹${rate}`;

        // Deduct payment from wallet
        try {
            await processPayment(user, rate, txType, txDesc);
        } catch (error) {
            return res.status(402).json({
                success: false,
                message: error.message,
                required: rate,
                currentBalance: user.walletBalance
            });
        }

        // Setup Vedic Astrology API credentials
        const astroUserId = process.env.ASTRO_USER_ID;
        const astroApiKey = process.env.ASTRO_API_KEY;

        if (!astroUserId || !astroApiKey) {
            return res.status(500).json({ success: false, message: "Astro API credentials missing in server config." });
        }

        const authHeader = "Basic " + Buffer.from(`${astroUserId}:${astroApiKey}`).toString("base64");
        const requestBody = { day, month, year, hour, min, lat, lon, tzone };

        // Step 1: Get the Sun Sign from birth details
        const astroDetailsRes = await axios.post(
            "https://json.astrologyapi.com/v1/astro_details",
            requestBody,
            { headers: { "Authorization": authHeader, "Content-Type": "application/json" } }
        );

        let sign = "aries"; // Default fallback
        if (astroDetailsRes.data && astroDetailsRes.data.sign) {
            sign = astroDetailsRes.data.sign.toLowerCase();
        }

        let finalData;

        if (isDaily) {
            // Step 2a: Fetch Daily Prediction - Returns Hindi text natively
            const apiResponse = await axios.post(
                `https://json.astrologyapi.com/v1/sun_sign_prediction/daily/${sign}`,
                {},
                { headers: { "Authorization": authHeader, "Content-Type": "application/json", "Accept-Language": "hi" } }
            );
            finalData = apiResponse.data;

        } else {
            // Step 2b: Fetch Weekly Prediction - Returns English text, so we translate via Gemini
            const apiResponse = await axios.post(
                `https://json.astrologyapi.com/v1/horoscope_prediction/weekly/${sign}`,
                {},
                { headers: { "Authorization": authHeader, "Content-Type": "application/json" } }
            );
            finalData = apiResponse.data;

            // Translate English prediction array to Hindi using Gemini AI
            if (finalData && finalData.prediction && Array.isArray(finalData.prediction)) {
                try {
                    const englishText = finalData.prediction.join(" ");
                    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                    const prompt = `Aap ek expert astrologer ho. Is English weekly horoscope prediction ko ekdum asaan, natural aur padhne mein achhi lagne wali Hindi (Devanagari script) mein translate karo. Paragraphs mein baant kar dena:\n\n${englishText}`;

                    const result = await model.generateContent(prompt);
                    finalData.prediction = result.response.text(); // Overwrite with Hindi text
                } catch (aiError) {
                    console.error("AI Translation Error:", aiError.message);
                    // Graceful fallback: return original English text
                }
            }
        }

        res.status(200).json({
            success: true,
            type: type,
            sign: sign,
            data: finalData,
            walletDeducted: rate,
            remainingBalance: user.walletBalance
        });

    } catch (error) {
        console.error("Horoscope Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ success: false, message: "Failed to generate horoscope. Please try again." });
    }
};

// @desc    Get Horoscope Rates
// @route   GET /api/horoscope/rates
// @access  Public
exports.getRates = async (req, res) => {
    try {
        const settings = await getSettings();
        res.status(200).json({
            success: true,
            dailyRate: settings.dailyHoroscopeRate,
            weeklyRate: settings.weeklyHoroscopeRate
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch rates" });
    }
};

const axios = require("axios");
const User = require("../models/User");
const Admin = require("../models/Admin");
const Transaction = require("../models/Transaction");
const AppSettings = require("../models/AppSettings");

// Helper: Get or create AppSettings (singleton)
const getSettings = async () => {
    let settings = await AppSettings.findOne();
    if (!settings) {
        settings = await AppSettings.create({ kundaliRate: 10 });
    }
    return settings;
};

// @desc    Generate Kundali (deducts wallet balance)
// @route   POST /api/kundali/generate
// @access  Private (User must be logged in)
exports.generateKundali = async (req, res) => {
    try {
        const { day, month, year, hour, min, lat, lon, tzone } = req.body;

        // Basic Validation
        if (!day || !month || !year || !hour || min === undefined || !lat || !lon || !tzone) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields: day, month, year, hour, min, lat, lon, tzone"
            });
        }

        // Get user from middleware (protectUser sets req.user)
        const user = req.user;

        // Get kundali rate from settings
        const settings = await getSettings();
        const kundaliRate = settings.kundaliRate;

        // Check user wallet balance
        if (user.walletBalance < kundaliRate) {
            return res.status(402).json({
                success: false,
                message: `Aapke wallet mein insufficient balance hai. Kundali generate karne ke liye ₹${kundaliRate} chahiye. Aapka balance: ₹${user.walletBalance}`,
                required: kundaliRate,
                currentBalance: user.walletBalance
            });
        }

        // --- Step 1: Deduct from user wallet ---
        const userBalanceBefore = user.walletBalance;
        user.walletBalance = userBalanceBefore - kundaliRate;
        await user.save();

        // --- Step 2: Record user deduction transaction ---
        await Transaction.create({
            user: user._id,
            type: "kundali_generation",
            amount: kundaliRate,
            direction: "debit",
            balanceBefore: userBalanceBefore,
            balanceAfter: user.walletBalance,
            description: `Kundali generation charge - ₹${kundaliRate}`,
            doneBy: "system"
        });

        // --- Step 3: Credit to Superadmin wallet ---
        const superAdmin = await Admin.findOne({ role: "superadmin" });
        if (superAdmin) {
            superAdmin.walletBalance = (superAdmin.walletBalance || 0) + kundaliRate;
            await superAdmin.save();
        }

        // --- Step 4: Now call AstrologyAPI ---
        const astroUserId = process.env.ASTRO_USER_ID;
        const astroApiKey = process.env.ASTRO_API_KEY;

        if (!astroUserId || !astroApiKey) {
            // Rollback wallet deduction if API key missing
            user.walletBalance = userBalanceBefore;
            await user.save();
            return res.status(500).json({ success: false, message: "Astro API credentials missing in .env" });
        }

        const authHeader = "Basic " + Buffer.from(`${astroUserId}:${astroApiKey}`).toString("base64");

        const requestBody = { day, month, year, hour, min, lat, lon, tzone };

        // Hit AstrologyAPI for planets data
        const planetsResponse = await axios.post(
            "https://json.astrologyapi.com/v1/planets",
            requestBody,
            { headers: { "Authorization": authHeader, "Content-Type": "application/json" } }
        );

        // Hit AstrologyAPI for birth details
        const birthDetailsResponse = await axios.post(
            "https://json.astrologyapi.com/v1/birth_details",
            requestBody,
            { headers: { "Authorization": authHeader, "Content-Type": "application/json" } }
        );

        // Hit AstrologyAPI for predictions for all 9 planets in Hindi
        const planetsList = ["sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn", "rahu", "ketu"];
        const predictionPromises = planetsList.map(planet => {
            return axios.post(
                `https://json.astrologyapi.com/v1/general_house_report/${planet}`,
                requestBody,
                { 
                    headers: { 
                        "Authorization": authHeader, 
                        "Content-Type": "application/json",
                        "Accept-Language": "hi"
                    } 
                }
            ).catch(err => {
                console.error(`Error fetching prediction for ${planet}:`, err.message);
                return { data: { planet: planet.charAt(0).toUpperCase() + planet.slice(1), house_report: "इस ग्रह के लिए भविष्यवाणी अभी उपलब्ध नहीं है।" } };
            });
        });

        const predictionsResponses = await Promise.all(predictionPromises);
        const predictions = predictionsResponses.map((res, index) => {
            const planetKey = planetsList[index];
            const capitalizedPlanet = planetKey.charAt(0).toUpperCase() + planetKey.slice(1);
            return {
                ...res.data,
                planet: capitalizedPlanet
            };
        });

        // --- Step 5: Send success response ---
        res.status(200).json({
            success: true,
            message: "Kundali generated successfully",
            charged: kundaliRate,
            walletBalance: user.walletBalance,
            data: {
                birthDetails: birthDetailsResponse.data,
                planets: planetsResponse.data,
                predictions: predictions
            }
        });

    } catch (error) {
        console.error("Error generating kundali:", error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: "Failed to generate Kundali",
            error: error.response?.data || error.message
        });
    }
};

// @desc    Get current Kundali rate (for frontend to display)
// @route   GET /api/kundali/rate
// @access  Public
exports.getKundaliRate = async (req, res) => {
    try {
        const settings = await getSettings();
        res.status(200).json({
            success: true,
            kundaliRate: settings.kundaliRate
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to get kundali rate" });
    }
};

const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../models/User");
const Admin = require("../models/Admin");
const Transaction = require("../models/Transaction");

// ============================================================
// @desc    Create Razorpay Order for Wallet Recharge
// @route   POST /api/payments/create-recharge-order
// @access  Private (User)
// ============================================================
exports.createRechargeOrder = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Valid amount is required" });
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const shortUserId = req.user._id.toString().substring(0, 6);
        const options = {
            amount: amount * 100, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
            currency: "INR",
            receipt: `rcpt_${shortUserId}_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        if (!order) {
            return res.status(500).json({ success: false, message: "Failed to create Razorpay order" });
        }

        res.status(200).json({
            success: true,
            order,
        });
    } catch (error) {
        console.error("Create Recharge Order Error:", error.message);
        res.status(500).json({ success: false, message: "Server error while creating order" });
    }
};

// ============================================================
// @desc    Verify Razorpay Payment and Add Money to Wallet
// @route   POST /api/payments/verify-recharge
// @access  Private (User)
// ============================================================
exports.verifyRecharge = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amount) {
            return res.status(400).json({ success: false, message: "All payment details are required" });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (!isAuthentic) {
            return res.status(400).json({ success: false, message: "Payment verification failed. Invalid signature." });
        }

        // 1. Find user
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const balanceBefore = user.walletBalance;

        // 2. Increase user wallet balance
        user.walletBalance += Number(amount);
        await user.save();

        // 3. Increase Superadmin's totalRechargeMoney
        const superadmin = await Admin.findOne({ role: "superadmin" });
        if (superadmin) {
            superadmin.totalRechargeMoney = (superadmin.totalRechargeMoney || 0) + Number(amount);
            await superadmin.save();
        }

        // 4. Create Transaction Record
        const transaction = await Transaction.create({
            user: user._id,
            type: "wallet_recharge",
            amount: Number(amount),
            direction: "credit",
            balanceBefore,
            balanceAfter: user.walletBalance,
            description: `Wallet recharged via Razorpay (Payment ID: ${razorpay_payment_id})`,
            doneBy: "user",
        });

        res.status(200).json({
            success: true,
            message: `Payment successful! ₹${amount} added to your wallet.`,
            newBalance: user.walletBalance,
            transaction,
        });
    } catch (error) {
        console.error("Verify Recharge Error:", error.message);
        res.status(500).json({ success: false, message: "Server error during verification" });
    }
};

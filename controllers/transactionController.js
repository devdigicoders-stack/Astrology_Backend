const Transaction = require("../models/Transaction");

// ============================================================
// @desc    Get logged-in user ki saari transactions
// @route   GET /api/transactions/my
// @access  Private (User)
// ============================================================
exports.getMyTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user._id })
            .sort({ createdAt: -1 }) // Newest first
            .populate("callId", "type totalDurationMinutes")
            .populate("orderId", "totalAmount orderStatus")
            .populate("poojaBookingId", "bookingDate bookingTime status");

        const totalDebit = transactions
            .filter(t => t.direction === "debit")
            .reduce((sum, t) => sum + t.amount, 0);

        const totalCredit = transactions
            .filter(t => t.direction === "credit")
            .reduce((sum, t) => sum + t.amount, 0);

        res.status(200).json({
            success: true,
            count: transactions.length,
            summary: {
                totalSpent: totalDebit,
                totalRecharged: totalCredit,
                net: totalCredit - totalDebit,
            },
            transactions,
        });
    } catch (error) {
        console.error("Get My Transactions Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch transactions" });
    }
};

// ============================================================
// @desc    Admin — Get all transactions (with optional user filter)
// @route   GET /api/transactions/admin
// @access  Private (Admin)
// ============================================================
exports.getAllTransactions = async (req, res) => {
    try {
        const filter = {};

        // Optional filter: specific user ki transactions
        if (req.query.userId) {
            filter.user = req.query.userId;
        }

        // Optional filter: type ke basis pe (wallet_recharge, call_deduction, etc.)
        if (req.query.type) {
            filter.type = req.query.type;
        }

        // Optional filter: direction (credit/debit)
        if (req.query.direction) {
            filter.direction = req.query.direction;
        }

        const transactions = await Transaction.find(filter)
            .select("-balanceAfter")
            .sort({ createdAt: -1 })
            .populate("user", "name phoneNumber email")
            .populate("callId", "type totalDurationMinutes totalCost")
            .populate("orderId", "totalAmount orderStatus")
            .populate("poojaBookingId", "bookingDate pricePaid status");

        const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);

        res.status(200).json({
            success: true,
            count: transactions.length,
            totalVolume,
            transactions,
        });
    } catch (error) {
        console.error("Get All Transactions Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch transactions" });
    }
};

// ============================================================
// @desc    Admin — Wallet Recharge karo user ka
// @route   POST /api/transactions/recharge
// @access  Private (Admin)
// ============================================================
exports.rechargeUserWallet = async (req, res) => {
    try {
        const { userId, amount, description } = req.body;

        if (!userId || !amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "userId aur valid amount required hai" });
        }

        const User = require("../models/User");
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const balanceBefore = user.walletBalance;
        user.walletBalance += Number(amount);
        await user.save();

        // Transaction record save karo
        const transaction = await Transaction.create({
            user: user._id,
            type: "wallet_recharge",
            amount: Number(amount),
            direction: "credit",
            balanceBefore,
            balanceAfter: user.walletBalance,
            description: description || `Wallet recharged by Admin with ₹${amount}`,
            doneBy: req.admin ? req.admin._id.toString() : "admin",
        });

        res.status(200).json({
            success: true,
            message: `₹${amount} user ke wallet mein add ho gaya!`,
            newBalance: user.walletBalance,
            transaction,
        });
    } catch (error) {
        console.error("Recharge Wallet Error:", error.message);
        res.status(500).json({ success: false, message: "Wallet recharge failed" });
    }
};

// ============================================================
// HELPER FUNCTION — Dusre controllers call karenge ise
// Transaction save karne ke liye (Internal use only)
// ============================================================
exports.saveTransaction = async ({
    userId,
    type,
    amount,
    direction,
    balanceBefore,
    balanceAfter,
    description,
    callId = null,
    orderId = null,
    poojaBookingId = null,
    doneBy = "system",
}) => {
    try {
        await Transaction.create({
            user: userId,
            type,
            amount,
            direction,
            balanceBefore,
            balanceAfter,
            description,
            callId,
            orderId,
            poojaBookingId,
            doneBy,
        });
    } catch (err) {
        // Transaction save fail hone pe app crash mat karo — sirf log karo
        console.error("saveTransaction helper Error:", err.message);
    }
};

// ============================================================
// @desc    Admin — Delete a transaction
// @route   DELETE /api/transactions/admin/:id
// @access  Private (Admin)
// ============================================================
exports.deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        
        if (!transaction) {
            return res.status(404).json({ success: false, message: "Transaction not found" });
        }

        await transaction.deleteOne();

        res.status(200).json({
            success: true,
            message: "Transaction deleted successfully"
        });
    } catch (error) {
        console.error("Delete Transaction Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to delete transaction" });
    }
};

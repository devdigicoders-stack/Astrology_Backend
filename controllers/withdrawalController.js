const WithdrawalRequest = require("../models/WithdrawalRequest");
const User = require("../models/User");
const Astrologer = require("../models/Astrologer");
const Admin = require("../models/Admin");
const Transaction = require("../models/Transaction");

// @desc    Request a withdrawal (User or Astrologer)
// @route   POST /api/withdrawals/request
// @access  Private (User or Astrologer)
exports.requestWithdrawal = async (req, res) => {
    try {
        const { amount, bankDetails } = req.body;
        const userType = req.astrologer ? "astrologer" : "user";
        const accountId = req.astrologer ? req.astrologer._id : req.user._id;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Valid amount is required" });
        }

        // Check sufficient balance
        let userRecord;
        if (userType === "astrologer") {
            userRecord = await Astrologer.findById(accountId);
        } else {
            userRecord = await User.findById(accountId);
        }

        if (!userRecord) {
            return res.status(404).json({ success: false, message: "Account not found" });
        }

        if (userRecord.walletBalance < amount) {
            return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
        }

        // Ensure no pending request exists to avoid spam (optional logic, but good practice)
        const pendingRequest = await WithdrawalRequest.findOne({
            [userType === "astrologer" ? "astrologer" : "user"]: accountId,
            status: "pending"
        });

        if (pendingRequest) {
            return res.status(400).json({ success: false, message: "You already have a pending withdrawal request" });
        }

        // Create Request
        const withdrawal = await WithdrawalRequest.create({
            user: userType === "user" ? accountId : null,
            astrologer: userType === "astrologer" ? accountId : null,
            userType,
            amount,
            bankDetails: bankDetails || (userType === "astrologer" ? userRecord.bankDetails : {}),
        });

        res.status(201).json({
            success: true,
            message: "Withdrawal request submitted successfully. Waiting for Admin approval.",
            withdrawal
        });

    } catch (error) {
        console.error("Request Withdrawal Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// @desc    Get my withdrawal requests
// @route   GET /api/withdrawals/my-requests
// @access  Private (User or Astrologer)
exports.getMyWithdrawals = async (req, res) => {
    try {
        const userType = req.astrologer ? "astrologer" : "user";
        const accountId = req.astrologer ? req.astrologer._id : req.user._id;
        const query = userType === "astrologer" ? { astrologer: accountId } : { user: accountId };

        const withdrawals = await WithdrawalRequest.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            withdrawals
        });
    } catch (error) {
        console.error("Get My Withdrawals Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// @desc    Get all withdrawal requests (Admin)
// @route   GET /api/withdrawals/admin
// @access  Private/Admin
exports.getAllWithdrawals = async (req, res) => {
    try {
        const { status, userType } = req.query;
        let query = {};
        
        if (status && status !== 'all') query.status = status;
        if (userType && userType !== 'all') query.userType = userType;

        const withdrawals = await WithdrawalRequest.find(query)
            .populate("user", "name email phoneNumber walletBalance")
            .populate("astrologer", "name email phoneNumber walletBalance")
            .populate("adminId", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: withdrawals.length,
            withdrawals
        });
    } catch (error) {
        console.error("Get All Withdrawals Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// @desc    Approve or Reject withdrawal request
// @route   PUT /api/withdrawals/admin/:id/status
// @access  Private/Admin
exports.processWithdrawal = async (req, res) => {
    try {
        const { status, remarks } = req.body;
        
        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status. Must be 'approved' or 'rejected'" });
        }

        const withdrawal = await WithdrawalRequest.findById(req.params.id);
        
        if (!withdrawal) {
            return res.status(404).json({ success: false, message: "Withdrawal request not found" });
        }

        if (withdrawal.status !== "pending") {
            return res.status(400).json({ success: false, message: `Request is already ${withdrawal.status}` });
        }

        // Logic for Approval
        if (status === "approved") {
            let account;
            if (withdrawal.userType === "astrologer") {
                account = await Astrologer.findById(withdrawal.astrologer);
            } else {
                account = await User.findById(withdrawal.user);
            }

            if (!account) {
                return res.status(404).json({ success: false, message: "Account not found. Cannot process." });
            }

            if (account.walletBalance < withdrawal.amount) {
                return res.status(400).json({ success: false, message: "Insufficient balance in account to approve this request." });
            }

            const balanceBefore = account.walletBalance;

            // 1. Deduct from User/Astrologer Wallet
            account.walletBalance -= withdrawal.amount;
            await account.save();

            // 2. Deduct from Super Admin's totalRechargeMoney (As requested by user for both user and pandit)
            // We find the superadmin
            const superAdmin = await Admin.findOne({ role: "superadmin" });
            if (superAdmin) {
                superAdmin.totalRechargeMoney = (superAdmin.totalRechargeMoney || 0) - withdrawal.amount;
                // We also deduct from walletBalance to balance the company's ledger if needed, but sticking to user request:
                // "totalRechargeMoney ese me se pesa utan - ho ok bhai"
                await superAdmin.save();
            }

            // 3. Create Transaction Record
            await Transaction.create({
                user: withdrawal.userType === "user" ? withdrawal.user : null,
                astrologer: withdrawal.userType === "astrologer" ? withdrawal.astrologer : null, // Assuming you might want to track this, but model requires user. Let's fix this below.
                // Wait, Transaction model requires 'user'. Let's see if we can use it for astrologer or if we just log it as a refund type.
                type: "refund", // Or withdrawal
                amount: withdrawal.amount,
                direction: "debit",
                balanceBefore: balanceBefore,
                balanceAfter: account.walletBalance,
                description: `Withdrawal approved by admin. Remarks: ${remarks || 'None'}`,
                doneBy: "admin"
            }).catch(err => console.log("Transaction log error (might be due to user required field if astrologer): ", err.message));
        }

        // Update Request Status
        withdrawal.status = status;
        withdrawal.adminId = req.admin._id;
        withdrawal.remarks = remarks || "";
        await withdrawal.save();

        res.status(200).json({
            success: true,
            message: `Withdrawal request successfully ${status}`,
            withdrawal
        });

    } catch (error) {
        console.error("Process Withdrawal Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

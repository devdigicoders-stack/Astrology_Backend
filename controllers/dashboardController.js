const User = require("../models/User");
const Astrologer = require("../models/Astrologer");
const Order = require("../models/Order");
const Transaction = require("../models/Transaction");
const CallHistory = require("../models/CallHistory");
const Product = require("../models/Product");
const Pooja = require("../models/Pooja");
const PoojaBooking = require("../models/PoojaBooking");
const Complaint = require("../models/Complaint");
const WithdrawalRequest = require("../models/WithdrawalRequest");
const Admin = require("../models/Admin");
const Review = require("../models/Review");
const Cart = require("../models/Cart");
const Notification = require("../models/Notification");

exports.getDashboardStats = async (req, res) => {
    try {
        // Run all queries in parallel for high performance
        const [
            totalUsers,
            activeUsers,
            
            totalAdmins,
            activeAdmins,
            
            totalAstrologers,
            pendingAstrologers,
            onlineAstrologers,
            
            totalOrders,
            pendingOrders,
            deliveredOrders,
            orderRevenueData,
            
            totalTransactions,
            successfulTransactionsVolume,
            
            totalCalls,
            ongoingCalls,
            callEarningsData,
            
            totalProducts,
            
            totalPoojas,
            totalPoojaBookings,
            poojaRevenueData,
            
            totalComplaints,
            pendingComplaints,
            
            totalWithdrawalRequests,
            pendingWithdrawals,
            approvedWithdrawalVolume,
            pendingWithdrawalVolume,
            
            totalReviews,
            totalPendingCarts,
            
            superAdminData,
            recentTransactions,
            aiChatRevenueData,
            kundaliRevenueData,
            horoscopeRevenueData,
            totalNotifications,
            recentNotifications
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ status: "active" }),
            
            Admin.countDocuments(),
            Admin.countDocuments({ isActive: true }),
            
            Astrologer.countDocuments(),
            Astrologer.countDocuments({ isVerified: false }),
            Astrologer.countDocuments({ availability: "online" }),
            
            Order.countDocuments(),
            Order.countDocuments({ orderStatus: { $in: ["Pending", "Processing"] } }),
            Order.countDocuments({ orderStatus: "Delivered" }),
            Order.aggregate([
                { $match: { paymentStatus: "Paid" } },
                { $group: { _id: null, totalVolume: { $sum: "$totalAmount" } } }
            ]),
            
            Transaction.countDocuments(),
            // Wallet recharges (direction: credit, type: wallet_recharge)
            Transaction.aggregate([
                { $match: { type: "wallet_recharge", direction: "credit" } },
                { $group: { _id: null, totalVolume: { $sum: "$amount" } } }
            ]),
            
            CallHistory.countDocuments(),
            CallHistory.countDocuments({ status: "ongoing" }),
            // Total Platform Earnings from Calls
            CallHistory.aggregate([
                { $match: { status: "completed" } },
                { $group: { _id: null, platformEarnings: { $sum: "$superAdminEarnings" }, astrologerEarnings: { $sum: "$astrologerEarnings" } } }
            ]),
            
            Product.countDocuments(),
            
            Pooja.countDocuments(),
            PoojaBooking.countDocuments(),
            // Pooja bookings revenue
            PoojaBooking.aggregate([
                { $match: { status: { $in: ["Confirmed", "Completed"] } } },
                { $group: { _id: null, totalVolume: { $sum: "$pricePaid" } } }
            ]),
            
            Complaint.countDocuments(),
            Complaint.countDocuments({ status: "Pending" }),
            
            WithdrawalRequest.countDocuments(),
            WithdrawalRequest.countDocuments({ status: "pending" }),
            WithdrawalRequest.aggregate([
                { $match: { status: "approved" } },
                { $group: { _id: null, totalVolume: { $sum: "$amount" } } }
            ]),
            WithdrawalRequest.aggregate([
                { $match: { status: "pending" } },
                { $group: { _id: null, totalVolume: { $sum: "$amount" } } }
            ]),
            
            // Total Reviews & Pending Carts
            Review.countDocuments(),
            Cart.countDocuments(),
            
            // Get Super Admin data for walletBalance and totalRechargeMoney
            Admin.findOne({ role: "superadmin" }),
            
            // Get 10 recent transactions populated with User data
            Transaction.find().sort({ createdAt: -1 }).limit(10).populate("user", "name email phoneNumber"),

            // Total AI Chat Revenue
            Transaction.aggregate([
                { $match: { type: "ai_chat", direction: "debit" } },
                { $group: { _id: null, totalVolume: { $sum: "$amount" } } }
            ]),

            // Total Kundali Revenue
            Transaction.aggregate([
                { $match: { type: "kundali_generation", direction: "debit" } },
                { $group: { _id: null, totalVolume: { $sum: "$amount" } } }
            ]),
            
            // Total Horoscope Revenue
            Transaction.aggregate([
                { $match: { type: { $in: ["daily_horoscope", "weekly_horoscope"] }, direction: "debit" } },
                { $group: { _id: null, totalVolume: { $sum: "$amount" } } }
            ]),
            
            // Notifications Data
            Notification.countDocuments({ isActive: true }),
            Notification.find({ isActive: true }).sort({ createdAt: -1 }).limit(5)
        ]);


        const walletRechargeRevenue = successfulTransactionsVolume.length > 0 ? successfulTransactionsVolume[0].totalVolume : 0;
        const ecommerceRevenue = orderRevenueData.length > 0 ? orderRevenueData[0].totalVolume : 0;
        const poojaRevenue = poojaRevenueData.length > 0 ? poojaRevenueData[0].totalVolume : 0;
        const platformCallEarnings = callEarningsData.length > 0 ? callEarningsData[0].platformEarnings : 0;
        const totalAstrologerCallEarnings = callEarningsData.length > 0 ? callEarningsData[0].astrologerEarnings : 0;
        const aiChatRevenue = aiChatRevenueData.length > 0 ? aiChatRevenueData[0].totalVolume : 0;
        const kundaliRevenue = kundaliRevenueData.length > 0 ? kundaliRevenueData[0].totalVolume : 0;
        const horoscopeRevenue = horoscopeRevenueData.length > 0 ? horoscopeRevenueData[0].totalVolume : 0;
        
        const approvedWithdrawalsSum = approvedWithdrawalVolume.length > 0 ? approvedWithdrawalVolume[0].totalVolume : 0;
        const pendingWithdrawalsSum = pendingWithdrawalVolume.length > 0 ? pendingWithdrawalVolume[0].totalVolume : 0;

        res.status(200).json({
            success: true,
            data: {
                users: {
                    total: totalUsers,
                    active: activeUsers,
                    pendingCarts: totalPendingCarts
                },
                admins: {
                    total: totalAdmins,
                    active: activeAdmins,
                    walletBalance: superAdminData ? superAdminData.walletBalance : 0,
                    totalRechargeMoney: superAdminData ? superAdminData.totalRechargeMoney : 0
                },
                astrologers: {
                    total: totalAstrologers,
                    pendingVerification: pendingAstrologers,
                    onlineNow: onlineAstrologers
                },
                ecommerce: {
                    totalOrders,
                    pendingOrders,
                    deliveredOrders,
                    totalProducts,
                    totalSalesRevenue: ecommerceRevenue
                },
                services: {
                    totalPoojas,
                    totalPoojaBookings,
                    poojaBookingRevenue: poojaRevenue,
                    totalCalls,
                    ongoingCalls,
                    platformCallEarnings,
                    totalAstrologerCallEarnings,
                    aiChatRevenue,
                    kundaliRevenue,
                    horoscopeRevenue,
                    totalReviews
                },
                financials: {
                    totalTransactions,
                    totalWalletRecharge: walletRechargeRevenue,
                    totalWithdrawalRequests,
                    pendingWithdrawals,
                    approvedWithdrawalsAmount: approvedWithdrawalsSum,
                    pendingWithdrawalsAmount: pendingWithdrawalsSum
                },
                support: {
                    totalComplaints,
                    pendingComplaints,
                    totalNotifications
                },
                recentActivity: {
                    transactions: recentTransactions,
                    notifications: recentNotifications
                }
            }
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ success: false, message: "Server error fetching dashboard stats", error: error.message });
    }
};

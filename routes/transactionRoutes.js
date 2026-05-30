const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");
const { protectUser, protectAdmin, checkPermission } = require("../middleware/authMiddleware");

// ── User Routes ────────────────────────────────────────────────
// User apni transactions dekhe
router.get("/my", protectUser, transactionController.getMyTransactions);

// ── Admin Routes ───────────────────────────────────────────────
// Admin saari transactions dekhe (optional filters: ?userId=, ?type=, ?direction=)
router.get("/admin", protectAdmin, checkPermission("view_transactions"), transactionController.getAllTransactions);

// Admin user ka wallet recharge kare
router.post("/recharge", protectAdmin, checkPermission("recharge_wallet"), transactionController.rechargeUserWallet);

// Admin transaction delete kare
router.delete("/admin/:id", protectAdmin, checkPermission("delete_transactions"), transactionController.deleteTransaction);

module.exports = router;

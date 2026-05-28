const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { protectUser, protectAdmin, checkPermission, authorizeRoles } = require("../middleware/authMiddleware");

// User routes
router.post("/initiate-payment", protectUser, orderController.initiatePayment);
router.post("/verify-and-create", protectUser, orderController.verifyAndCreateOrder);
router.get("/myorders", protectUser, orderController.getMyOrders);

// Admin routes
router.get("/admin", protectAdmin, checkPermission("view_orders"), orderController.getAllOrders);
router.put("/:id/status", protectAdmin, checkPermission("update_order_status"), orderController.updateOrderStatus);

module.exports = router;

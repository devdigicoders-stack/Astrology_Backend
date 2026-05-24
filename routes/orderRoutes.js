const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { protectUser, protectAdmin, authorizeRoles } = require("../middleware/authMiddleware");

// User routes
router.post("/initiate-payment", protectUser, orderController.initiatePayment);
router.post("/verify-and-create", protectUser, orderController.verifyAndCreateOrder);
router.get("/myorders", protectUser, orderController.getMyOrders);

// SuperAdmin routes
router.get("/admin", protectAdmin, authorizeRoles("superadmin"), orderController.getAllOrders);
router.put("/:id/status", protectAdmin, authorizeRoles("superadmin"), orderController.updateOrderStatus);

module.exports = router;

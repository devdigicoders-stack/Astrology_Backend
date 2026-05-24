const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { protectUser, protectAdmin, authorizeRoles } = require("../middleware/authMiddleware");

// SuperAdmin Route (To view all users' carts)
router.get("/admin", protectAdmin, authorizeRoles("superadmin"), cartController.getAllCarts);

// All cart routes below are protected for users only
router.post("/", protectUser, cartController.addToCart);
router.get("/", protectUser, cartController.getCart);
router.delete("/:productId", protectUser, cartController.removeItem);
router.delete("/", protectUser, cartController.clearCart);

module.exports = router;

const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { protectUser, protectAdmin, checkPermission } = require("../middleware/authMiddleware");

// SuperAdmin Routes (To manage users' carts)
router.get("/admin", protectAdmin, checkPermission("view_carts"), cartController.getAllCarts);
router.get("/admin/:id", protectAdmin, checkPermission("view_carts"), cartController.getCartByIdAdmin);
router.delete("/admin/:id", protectAdmin, checkPermission("delete_carts"), cartController.deleteCartAdmin);
router.patch("/admin/:id/status", protectAdmin, checkPermission("edit_carts"), cartController.toggleCartStatusAdmin);

// All cart routes below are protected for users only
router.post("/", protectUser, cartController.addToCart);
router.get("/", protectUser, cartController.getCart);
router.delete("/:productId", protectUser, cartController.removeItem);
router.delete("/", protectUser, cartController.clearCart);

module.exports = router;

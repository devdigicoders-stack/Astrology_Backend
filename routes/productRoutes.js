const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { protectAdmin, checkPermission } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Public routes (Customers)
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);

// Admin routes with SaaS permissions
router.get("/admin/all", protectAdmin, checkPermission("view_products"), productController.getAdminProducts);
router.post("/", protectAdmin, checkPermission("create_products"), upload.array("images", 5), productController.createProduct);
router.put("/:id", protectAdmin, checkPermission("edit_products"), upload.array("images", 5), productController.updateProduct);
router.delete("/:id", protectAdmin, checkPermission("delete_products"), productController.deleteProduct);

module.exports = router;

const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { protectAdmin, authorizeRoles } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Public routes (Customers)
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);

// SuperAdmin only routes
router.post("/", protectAdmin, authorizeRoles("superadmin"), upload.array("images", 5), productController.createProduct);
router.put("/:id", protectAdmin, authorizeRoles("superadmin"), upload.array("images", 5), productController.updateProduct);
router.delete("/:id", protectAdmin, authorizeRoles("superadmin"), productController.deleteProduct);

module.exports = router;

const express = require("express");
const router = express.Router();
const poojaController = require("../controllers/poojaController");
const { protectAdmin, checkPermission } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Public routes
router.get("/", poojaController.getAllPoojas);
router.get("/:id", poojaController.getPoojaById);

// Admin routes with SaaS permissions
router.get("/admin/all", protectAdmin, checkPermission("view_pooja"), poojaController.getAdminPoojas);
router.post("/", protectAdmin, checkPermission("create_pooja"), upload.single("image"), poojaController.createPooja);
router.put("/:id", protectAdmin, checkPermission("edit_pooja"), upload.single("image"), poojaController.updatePooja);
router.delete("/:id", protectAdmin, checkPermission("delete_pooja"), poojaController.deletePooja);

module.exports = router;

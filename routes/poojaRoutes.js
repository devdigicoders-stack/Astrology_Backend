const express = require("express");
const router = express.Router();
const poojaController = require("../controllers/poojaController");
const { protectAdmin, authorizeRoles } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Public routes
router.get("/", poojaController.getAllPoojas);
router.get("/:id", poojaController.getPoojaById);

// Admin only routes (Now strictly SuperAdmin only!)
router.post("/", protectAdmin, authorizeRoles("superadmin"), upload.single("image"), poojaController.createPooja);
router.put("/:id", protectAdmin, authorizeRoles("superadmin"), upload.single("image"), poojaController.updatePooja);
router.delete("/:id", protectAdmin, authorizeRoles("superadmin"), poojaController.deletePooja);

module.exports = router;

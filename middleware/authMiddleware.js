const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Astrologer = require("../models/Astrologer");
const Admin = require("../models/Admin");

// General middleware to verify token and decode details
const verifyToken = (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_key");
            req.decodedUser = decoded; // { id, role }
            next();
        } catch (error) {
            console.error("JWT Verification Error:", error.message);
            return res.status(401).json({ success: false, message: "Not authorized, token failed" });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: "Not authorized, no token provided" });
    }
};

// Protect route for Customers (Users)
const protectUser = async (req, res, next) => {
    verifyToken(req, res, async () => {
        try {
            if (req.decodedUser.role !== "user") {
                return res.status(403).json({ success: false, message: "Access denied: User resource" });
            }

            const user = await User.findById(req.decodedUser.id);
            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            if (!user.isActive) {
                return res.status(403).json({ success: false, message: "User account is suspended" });
            }

            req.user = user;
            next();
        } catch (error) {
            return res.status(500).json({ success: false, message: "Server error in auth middleware" });
        }
    });
};

// Protect route for Astrologers
const protectAstrologer = async (req, res, next) => {
    verifyToken(req, res, async () => {
        try {
            if (req.decodedUser.role !== "astrologer") {
                return res.status(403).json({ success: false, message: "Access denied: Astrologer resource" });
            }

            const astrologer = await Astrologer.findById(req.decodedUser.id);
            if (!astrologer) {
                return res.status(404).json({ success: false, message: "Astrologer not found" });
            }

            req.astrologer = astrologer;
            next();
        } catch (error) {
            return res.status(500).json({ success: false, message: "Server error in auth middleware" });
        }
    });
};

// Protect route for Admin/Super Admin
const protectAdmin = async (req, res, next) => {
    verifyToken(req, res, async () => {
        try {
            if (req.decodedUser.role !== "admin" && req.decodedUser.role !== "superadmin") {
                return res.status(403).json({ success: false, message: "Access denied: Admin resource only" });
            }

            const admin = await Admin.findById(req.decodedUser.id);
            if (!admin) {
                return res.status(404).json({ success: false, message: "Admin not found" });
            }

            if (!admin.isActive) {
                return res.status(403).json({ success: false, message: "Admin account is deactivated" });
            }

            req.admin = admin;
            next();
        } catch (error) {
            return res.status(500).json({ success: false, message: "Server error in admin auth middleware" });
        }
    });
};

// ------------------------------------------------------------
// Middleware: allow either a logged-in USER or an ASTROLOGER
// ------------------------------------------------------------
const protectAnyParticipant = async (req, res, next) => {
  // Verify JWT first (reuse existing verifyToken)
  verifyToken(req, res, async () => {
    try {
      // If token belongs to a normal user
      if (req.decodedUser.role === "user") {
        const user = await User.findById(req.decodedUser.id);
        if (user && user.isActive) {
          req.user = user;
          return next();
        }
      }

      // If token belongs to an astrologer
      if (req.decodedUser.role === "astrologer") {
        const astrologer = await Astrologer.findById(req.decodedUser.id);
        if (astrologer) {
          req.astrologer = astrologer;
          return next();
        }
      }

      // Not a participant
      return res
        .status(403)
        .json({ success: false, message: "Access denied: Not a participant" });
    } catch (err) {
      console.error("protectAnyParticipant error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  });
};

// Middleware to restrict access to specific roles (e.g. only 'superadmin')
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.admin || !roles.includes(req.admin.role)) {
            return res.status(403).json({
                success: false,
                message: `Role (${req.admin ? req.admin.role : "none"}) is not authorized to access this resource`,
            });
        }
        next();
    };
};

module.exports = {
    protectUser,
    protectAstrologer,
    protectAdmin,
    protectAnyParticipant,
    authorizeRoles,
};

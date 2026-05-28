const PoojaBooking = require("../models/PoojaBooking");
const Pooja = require("../models/Pooja");
const User = require("../models/User");
const Admin = require("../models/Admin");
const Notification = require("../models/Notification");

// @desc    Book a Pooja and deduct wallet balance
// @route   POST /api/booking/pooja
// @access  Private (User)
exports.bookPooja = async (req, res) => {
    try {
        const { poojaId, bookingDate, bookingTime, address } = req.body;

        if (!poojaId || !bookingDate || !bookingTime || !address) {
            return res.status(400).json({ success: false, message: "Please provide poojaId, bookingDate, bookingTime, and address" });
        }

        // 1. Check if Pooja exists and is active
        const pooja = await Pooja.findById(poojaId);
        if (!pooja || !pooja.isActive) {
            return res.status(404).json({ success: false, message: "Pooja not found or currently unavailable" });
        }

        const price = pooja.price;

        // 2. Fetch User and check wallet balance
        const user = await User.findById(req.user._id);
        if (user.walletBalance < price) {
            return res.status(400).json({ 
                success: false, 
                message: "Insufficient wallet balance. Please recharge your wallet." 
            });
        }

        // 3. Find SuperAdmin to transfer funds to
        const superAdmin = await Admin.findOne({ role: "superadmin" });
        if (!superAdmin) {
            return res.status(500).json({ success: false, message: "System error: SuperAdmin not found to receive payments" });
        }

        // 4. Perform Wallet Transaction (Deduct from User, Add to SuperAdmin)
        user.walletBalance -= price;
        superAdmin.walletBalance += price;

        await user.save();
        await superAdmin.save();

        // 5. Create Booking Record
        const booking = await PoojaBooking.create({
            user: user._id,
            pooja: pooja._id,
            bookingDate,
            bookingTime,
            pricePaid: price,
            address,
            status: "Confirmed",
        });

        // 6. Create Notification for User
        await Notification.create({
            title: "Pooja Booking Confirmed!",
            message: `Your booking for ${pooja.name} on ${bookingDate} at ${bookingTime} is confirmed. ₹${price} has been deducted from your wallet.`,
            targetAudience: "users",
            type: "alert",
            createdBy: superAdmin._id // Using superadmin as the creator of system notification
        });

        res.status(201).json({
            success: true,
            message: "Pooja booked successfully",
            booking,
            remainingBalance: user.walletBalance
        });

    } catch (error) {
        console.error("Book Pooja Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to book pooja" });
    }
};

// @desc    Get user's pooja booking history
// @route   GET /api/booking/pooja/history
// @access  Private (User)
exports.getUserPoojaHistory = async (req, res) => {
    try {
        const bookings = await PoojaBooking.find({ user: req.user._id })
            .populate("pooja", "name category image")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: bookings.length,
            bookings,
        });
    } catch (error) {
        console.error("Get User Pooja History Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch booking history" });
    }
};

// @desc    Get all pooja bookings (For Admin Panel)
// @route   GET /api/booking/pooja/admin
// @access  Private (Admin & SuperAdmin)
exports.getAllPoojaBookings = async (req, res) => {
    try {
        const bookings = await PoojaBooking.find()
            .populate("user", "name phoneNumber email")
            .populate("pooja", "name category price")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: bookings.length,
            bookings,
        });
    } catch (error) {
        console.error("Get All Pooja Bookings Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch bookings" });
    }
};

// @desc    Update pooja booking status
// @route   PUT /api/booking/pooja/:id/status
// @access  Private (SuperAdmin Only)
exports.updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        const validStatuses = ["Confirmed", "Completed", "Cancelled"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid booking status" });
        }

        const booking = await PoojaBooking.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        res.status(200).json({
            success: true,
            message: `Booking status updated to ${status}`,
            booking,
        });
    } catch (error) {
        console.error("Update Booking Status Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update booking status" });
    }
};

// @desc    Delete pooja booking
// @route   DELETE /api/booking/pooja/:id
// @access  Private (SuperAdmin Only)
exports.deleteBooking = async (req, res) => {
    try {
        const booking = await PoojaBooking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        await booking.deleteOne();

        res.status(200).json({
            success: true,
            message: "Booking deleted successfully"
        });
    } catch (error) {
        console.error("Delete Booking Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to delete booking" });
    }
};

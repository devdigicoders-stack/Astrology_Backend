const mongoose = require("mongoose");

const PoojaBookingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        pooja: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Pooja",
            required: true,
        },
        bookingDate: {
            type: String, // Format: YYYY-MM-DD
            required: [true, "Booking date is required"],
        },
        bookingTime: {
            type: String, // Format: HH:MM
            required: [true, "Booking time is required"],
        },
        pricePaid: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
            default: "Confirmed", // By default confirmed kyunki wallet se paisa kat chuka hai
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("PoojaBooking", PoojaBookingSchema);

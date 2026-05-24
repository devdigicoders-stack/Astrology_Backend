const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    price: {
        type: Number,
        required: true, // Saving price at the time of order in case product price changes later
    }
});

const OrderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        orderItems: [OrderItemSchema],
        totalAmount: {
            type: Number,
            required: true,
        },
        shippingAddress: {
            address: { type: String, required: true },
            city: { type: String, required: true },
            postalCode: { type: String, required: true },
            state: { type: String, required: true },
            country: { type: String, required: true },
        },
        paymentStatus: {
            type: String,
            enum: ["Pending", "Paid", "Failed"],
            default: "Pending", // Payment gateway integration later will update this
        },
        orderStatus: {
            type: String,
            enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
            default: "Processing",
        },
        transactionId: {
            type: String, // From Razorpay/Stripe etc.
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Order", OrderSchema);

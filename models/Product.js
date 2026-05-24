const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Product name is required"],
            trim: true,
        },
        category: {
            type: String,
            enum: ["Gemstone", "Rudraksha", "Yantra", "Book", "Other"],
            required: [true, "Product category is required"],
        },
        description: {
            type: String,
            required: [true, "Product description is required"],
        },
        price: {
            type: Number,
            required: [true, "Product price is required"],
            min: [0, "Price cannot be negative"],
        },
        stock: {
            type: Number,
            required: [true, "Product stock is required"],
            min: [0, "Stock cannot be negative"],
            default: 0,
        },
        images: {
            type: [String], // Array of image URLs
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin", // SuperAdmin who created it
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Product", ProductSchema);

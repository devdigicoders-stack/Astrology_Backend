const mongoose = require("mongoose");

const PoojaSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Pooja name is required"],
            trim: true,
        },
        category: {
            type: String,
            enum: ["Health", "Marriage", "Career", "Wealth", "Dosha Nivaran", "Other"],
            required: [true, "Pooja category is required"],
        },
        description: {
            type: String,
            required: [true, "Pooja description is required"],
        },
        price: {
            type: Number,
            required: [true, "Pooja price is required"],
            min: [0, "Price cannot be negative"],
        },
        image: {
            type: String,
            default: "",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin", // Admin who created the pooja service
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Pooja", PoojaSchema);

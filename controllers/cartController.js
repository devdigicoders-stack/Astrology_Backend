const Cart = require("../models/Cart");
const Product = require("../models/Product");

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private (User)
exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const qty = quantity || 1;

        // Verify product exists and is active
        const product = await Product.findById(productId);
        if (!product || !product.isActive) {
            return res.status(404).json({ success: false, message: "Product not found or unavailable" });
        }

        // Verify stock
        if (product.stock < qty) {
            return res.status(400).json({ success: false, message: `Only ${product.stock} items left in stock` });
        }

        // Find user cart or create new one
        let cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            cart = new Cart({ user: req.user._id, items: [] });
        }

        // Check if product is already in cart
        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

        if (itemIndex > -1) {
            // If exists, update quantity
            const newQty = cart.items[itemIndex].quantity + qty;
            if (product.stock < newQty) {
                return res.status(400).json({ success: false, message: `Cannot add more. Only ${product.stock} items left in stock` });
            }
            cart.items[itemIndex].quantity = newQty;
        } else {
            // Add new item
            cart.items.push({ product: productId, quantity: qty });
        }

        await cart.save();

        res.status(200).json({
            success: true,
            message: "Item added to cart",
            cart,
        });
    } catch (error) {
        console.error("Add to Cart Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to add item to cart" });
    }
};

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private (User)
exports.getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id })
            .populate("items.product", "name price images stock isActive category");

        if (!cart) {
            return res.status(200).json({
                success: true,
                message: "Cart is empty",
                cart: { items: [], totalAmount: 0 },
            });
        }

        // Calculate total amount dynamically based on latest prices
        let totalAmount = 0;
        const availableItems = [];

        // Filter out inactive products and calculate total
        for (let item of cart.items) {
            if (item.product && item.product.isActive) {
                totalAmount += item.product.price * item.quantity;
                availableItems.push(item);
            }
        }

        res.status(200).json({
            success: true,
            cart: {
                _id: cart._id,
                user: cart.user,
                items: availableItems,
                totalAmount,
            },
        });
    } catch (error) {
        console.error("Get Cart Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch cart" });
    }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:productId
// @access  Private (User)
exports.removeItem = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        cart.items = cart.items.filter(item => item.product.toString() !== req.params.productId);
        await cart.save();

        res.status(200).json({
            success: true,
            message: "Item removed from cart",
            cart,
        });
    } catch (error) {
        console.error("Remove Item Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to remove item" });
    }
};

// @desc    Clear entire cart
// @route   DELETE /api/cart
// @access  Private (User)
exports.clearCart = async (req, res) => {
    try {
        await Cart.findOneAndDelete({ user: req.user._id });

        res.status(200).json({
            success: true,
            message: "Cart cleared successfully",
        });
    } catch (error) {
        console.error("Clear Cart Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to clear cart" });
    }
};

// @desc    Get all users carts (For SuperAdmin)
// @route   GET /api/cart/admin
// @access  Private (SuperAdmin Only)
exports.getAllCarts = async (req, res) => {
    try {
        const carts = await Cart.find()
            .populate("user", "name email phoneNumber")
            .populate("items.product", "name price category images");

        res.status(200).json({
            success: true,
            count: carts.length,
            carts,
        });
    } catch (error) {
        console.error("Get All Carts Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch all carts" });
    }
};

// @desc    Get specific cart by ID (For SuperAdmin)
// @route   GET /api/cart/admin/:id
// @access  Private (SuperAdmin Only)
exports.getCartByIdAdmin = async (req, res) => {
    try {
        const cart = await Cart.findById(req.params.id)
            .populate("user", "name email phoneNumber")
            .populate("items.product", "name price category images");

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        res.status(200).json({
            success: true,
            cart,
        });
    } catch (error) {
        console.error("Get Cart By ID Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch cart details" });
    }
};

// @desc    Delete a specific cart (For SuperAdmin)
// @route   DELETE /api/cart/admin/:id
// @access  Private (SuperAdmin Only)
exports.deleteCartAdmin = async (req, res) => {
    try {
        const cart = await Cart.findById(req.params.id);

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        await Cart.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Cart deleted successfully",
        });
    } catch (error) {
        console.error("Delete Cart Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to delete cart" });
    }
};

// @desc    Toggle Cart Active/Inactive Status (For SuperAdmin)
// @route   PATCH /api/cart/admin/:id/status
// @access  Private (SuperAdmin Only)
exports.toggleCartStatusAdmin = async (req, res) => {
    try {
        const { isActive } = req.body;

        if (isActive === undefined) {
            return res.status(400).json({
                success: false,
                message: "isActive field required hai (true ya false)",
            });
        }

        const cart = await Cart.findById(req.params.id);

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        cart.isActive = isActive;
        await cart.save();

        res.status(200).json({
            success: true,
            message: `Cart ${isActive ? "Activate" : "Deactivate"} ho gaya!`,
            cart,
        });
    } catch (error) {
        console.error("Toggle Cart Status Error:", error.message);
        res.status(500).json({ success: false, message: "Status update karne mein error aaya" });
    }
};

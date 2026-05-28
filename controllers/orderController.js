const Order = require("../models/Order");
const Product = require("../models/Product");

const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "test",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "test_secret"
});

// @desc    Initiate Payment (Creates Razorpay Order, does NOT save to DB yet)
// @route   POST /api/orders/initiate-payment
// @access  Private (User Only)
exports.initiatePayment = async (req, res) => {
    try {
        const { orderItems } = req.body;

        if (!orderItems || orderItems.length === 0) {
            return res.status(400).json({ success: false, message: "No order items" });
        }

        // Calculate total amount and verify stock
        let totalAmount = 0;

        for (let item of orderItems) {
            const product = await Product.findById(item.product);
            
            if (!product) {
                return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Not enough stock for ${product.name}. Available: ${product.stock}` 
                });
            }

            totalAmount += product.price * item.quantity;
        }

        // Create Razorpay Order
        const options = {
            amount: totalAmount * 100, // Razorpay amount is in paise
            currency: "INR",
            receipt: `receipt_order_${Date.now()}`
        };

        const razorpayOrder = await razorpay.orders.create(options);

        res.status(200).json({
            success: true,
            message: "Payment initiated successfully",
            totalAmount,
            razorpayOrderId: razorpayOrder.id,
            currency: razorpayOrder.currency
        });

    } catch (error) {
        console.error("Initiate Payment Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to initiate payment" });
    }
};

// @desc    Verify Payment and Create Order in DB
// @route   POST /api/orders/verify-and-create
// @access  Private (User)
exports.verifyAndCreateOrder = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            orderItems,
            shippingAddress
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment details missing" });
        }

        if (!shippingAddress) {
            return res.status(400).json({ success: false, message: "Shipping address is required" });
        }

        // Verify Signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Invalid payment signature. Payment verification failed." });
        }

        // Re-calculate and prepare items for DB
        let totalAmount = 0;
        const verifiedOrderItems = [];

        for (let item of orderItems) {
            const product = await Product.findById(item.product);
            
            // Double check stock again just in case someone bought it while user was paying
            if (!product || product.stock < item.quantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Transaction verified but stock unavailable for ${product?.name || "a product"}. Refund will be initiated.` 
                });
            }

            totalAmount += product.price * item.quantity;
            
            verifiedOrderItems.push({
                product: product._id,
                quantity: item.quantity,
                price: product.price,
            });
        }

        // Create Order in Database
        const order = await Order.create({
            user: req.user._id,
            orderItems: verifiedOrderItems,
            shippingAddress,
            totalAmount,
            paymentStatus: "Paid", // Direct mark as paid
            transactionId: razorpay_payment_id
        });

        // Deduct stock for each product
        for (let item of verifiedOrderItems) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity }
            });
        }

        // Add to SuperAdmin Wallet for tracking revenue
        const Admin = require("../models/Admin");
        const superAdmin = await Admin.findOne({ role: "superadmin" });
        if (superAdmin) {
            superAdmin.walletBalance += totalAmount;
            await superAdmin.save();
        }

        res.status(201).json({
            success: true,
            message: "Payment verified and Order created successfully.",
            order,
        });

    } catch (error) {
        console.error("Verify and Create Order Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to verify payment and create order" });
    }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private (User)
exports.getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .populate("orderItems.product", "name category images")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            orders,
        });
    } catch (error) {
        console.error("Get My Orders Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
};

// @desc    Get all orders
// @route   GET /api/orders/admin
// @access  Private (Admin & SuperAdmin)
exports.getAllOrders = async (req, res) => {
    try {
        let query = {};

        const orders = await Order.find(query)
            .populate("user", "name phoneNumber email")
            .populate("orderItems.product", "name images category")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            orders,
        });
    } catch (error) {
        console.error("Get All Orders Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (SuperAdmin Only)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderStatus } = req.body;
        
        const validStatuses = ["Processing", "Shipped", "Delivered", "Cancelled"];
        if (!validStatuses.includes(orderStatus)) {
            return res.status(400).json({ success: false, message: "Invalid order status" });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Optional: Ensure admin has permission to edit this order (if they created the product inside)
        // Sabhi Admins sab orders dekh/update kar sakte hain

        order.orderStatus = orderStatus;
        await order.save();

        res.status(200).json({
            success: true,
            message: `Order status updated to ${orderStatus}`,
            order,
        });
    } catch (error) {
        console.error("Update Order Status Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update order status" });
    }
};

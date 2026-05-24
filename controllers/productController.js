const Product = require("../models/Product");

// @desc    Create a new product
// @route   POST /api/products
// @access  Private (SuperAdmin Only)
exports.createProduct = async (req, res) => {
    try {
        let { name, category, description, price, stock, images, isActive } = req.body;

        // Parse images if sent as stringified JSON or single string
        if (typeof images === "string") {
            try { images = JSON.parse(images); } catch(e) { images = [images]; }
        } else if (!images) {
            images = [];
        }

        // Add any newly uploaded files
        if (req.files && req.files.length > 0) {
            const uploadedImages = req.files.map(file => file.filename);
            images = [...images, ...uploadedImages];
        }

        if (!name || !category || !description || price === undefined || stock === undefined) {
            return res.status(400).json({
                success: false,
                message: "Please provide name, category, description, price, and stock",
            });
        }

        const product = await Product.create({
            name,
            category,
            description,
            price,
            stock,
            images: images || [],
            isActive: isActive !== undefined ? isActive : true,
            createdBy: req.admin._id,
        });

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product,
        });
    } catch (error) {
        console.error("Create Product Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to create product" });
    }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getAllProducts = async (req, res) => {
    try {
        // By default show only active products to public
        const query = req.query.all === "true" ? {} : { isActive: true };

        if (req.query.category) {
            query.category = req.query.category;
        }

        const products = await Product.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: products.length,
            products,
        });
    } catch (error) {
        console.error("Get All Products Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch products" });
    }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.status(200).json({
            success: true,
            product,
        });
    } catch (error) {
        console.error("Get Product By ID Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch product" });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (SuperAdmin Only)
exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        let { name, category, description, price, stock, images, isActive } = req.body;

        // Parse images if sent as stringified JSON or single string
        if (typeof images === "string") {
            try { images = JSON.parse(images); } catch(e) { images = [images]; }
        } else if (!images) {
            images = [];
        }

        // Add any newly uploaded files
        if (req.files && req.files.length > 0) {
            const uploadedImages = req.files.map(file => file.filename);
            images = [...images, ...uploadedImages];
        }

        if (name) product.name = name;
        if (category) product.category = category;
        if (description) product.description = description;
        if (price !== undefined) product.price = price;
        if (stock !== undefined) product.stock = stock;
        if (images) product.images = images;
        if (isActive !== undefined) product.isActive = isActive;

        await product.save();

        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product,
        });
    } catch (error) {
        console.error("Update Product Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update product" });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (SuperAdmin Only)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        await Product.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Product deleted successfully",
        });
    } catch (error) {
        console.error("Delete Product Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to delete product" });
    }
};

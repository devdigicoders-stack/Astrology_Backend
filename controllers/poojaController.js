const Pooja = require("../models/Pooja");

// @desc    Create a new Pooja Service
// @route   POST /api/pooja
// @access  Private (Admin & SuperAdmin)
exports.createPooja = async (req, res) => {
    try {
        let { name, category, description, price, image, isActive } = req.body;

        if (req.file) {
            image = req.file.filename;
        }

        if (!name || !category || !description || price === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: "Please provide all required fields (name, category, description, price)" 
            });
        }

        const pooja = await Pooja.create({
            name,
            category,
            description,
            price,
            image,
            isActive: isActive !== undefined ? isActive : true,
            createdBy: req.admin._id,
        });

        res.status(201).json({
            success: true,
            message: "Pooja service created successfully",
            pooja,
        });
    } catch (error) {
        console.error("Create Pooja Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to create pooja service" });
    }
};

// @desc    Get all Pooja Services
// @route   GET /api/pooja
// @access  Public / Private
exports.getAllPoojas = async (req, res) => {
    try {
        // Sirf active pooja dikhao, unless query me sab manga ho
        const query = req.query.all === "true" ? {} : { isActive: true };
        
        const poojas = await Pooja.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: poojas.length,
            poojas,
        });
    } catch (error) {
        console.error("Get All Poojas Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch pooja services" });
    }
};

// @desc    Get all Pooja Services for Admin Panel (Isolated)
// @route   GET /api/pooja/admin/all
// @access  Private (Admin & SuperAdmin)
exports.getAdminPoojas = async (req, res) => {
    try {
        let query = {};

        const poojas = await Pooja.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: poojas.length,
            poojas,
        });
    } catch (error) {
        console.error("Get Admin Poojas Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch pooja services" });
    }
};

// @desc    Get Pooja by ID
// @route   GET /api/pooja/:id
// @access  Public / Private
exports.getPoojaById = async (req, res) => {
    try {
        const pooja = await Pooja.findById(req.params.id);
        
        if (!pooja) {
            return res.status(404).json({ success: false, message: "Pooja service not found" });
        }

        res.status(200).json({
            success: true,
            pooja,
        });
    } catch (error) {
        console.error("Get Pooja Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch pooja details" });
    }
};

// @desc    Update a Pooja Service
// @route   PUT /api/pooja/:id
// @access  Private (Admin & SuperAdmin)
exports.updatePooja = async (req, res) => {
    try {
        let { name, category, description, price, image, isActive } = req.body;

        if (req.file) {
            image = req.file.filename;
        }

        const pooja = await Pooja.findById(req.params.id);
        if (!pooja) {
            return res.status(404).json({ success: false, message: "Pooja service not found" });
        }

        // Sabhi Admins Pooja edit kar sakte hain (SuperAdmin & Normal Admin)
        // Agar aap chahte hain ki sirf jisne create ki wahi edit kare, toh yahan condition laga sakte hain.
        // Abhi ke liye platform-wide pooja list hogi jo sabhi admins manage karenge.

        if (name) pooja.name = name;
        if (category) pooja.category = category;
        if (description) pooja.description = description;
        if (price !== undefined) pooja.price = price;
        if (image !== undefined) pooja.image = image;
        if (isActive !== undefined) pooja.isActive = isActive;

        await pooja.save();

        res.status(200).json({
            success: true,
            message: "Pooja service updated successfully",
            pooja,
        });
    } catch (error) {
        console.error("Update Pooja Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to update pooja service" });
    }
};

// @desc    Delete a Pooja Service
// @route   DELETE /api/pooja/:id
// @access  Private (Admin & SuperAdmin)
exports.deletePooja = async (req, res) => {
    try {
        const pooja = await Pooja.findById(req.params.id);
        if (!pooja) {
            return res.status(404).json({ success: false, message: "Pooja service not found" });
        }

        await Pooja.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Pooja service deleted successfully",
        });
    } catch (error) {
        console.error("Delete Pooja Error:", error.message);
        res.status(500).json({ success: false, message: "Failed to delete pooja service" });
    }
};

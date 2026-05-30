require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const astrologerRoutes = require("./routes/astrologerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const poojaRoutes = require("./routes/poojaRoutes");
const poojaBookingRoutes = require("./routes/poojaBookingRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const cartRoutes = require("./routes/cartRoutes");
const callRoutes = require("./routes/callRoutes");

const chatRoutes = require("./routes/chatRoutes");
const aiChatRoutes = require("./routes/aiChatRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const kundaliRoutes = require("./routes/kundaliRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const withdrawalRoutes = require("./routes/withdrawalRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
// Attach io to the app so controllers can use it
app.set("io", io);

// Attach our call handler logic
require("./sockets/callHandler").initSocket(io);

connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Handle invalid JSON syntax errors gracefully
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({ success: false, message: "Invalid JSON format in request body" });
    }
    next();
});

// Routes
app.use("/api/user", userRoutes);
app.use("/api/astrologer", astrologerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/complaint", complaintRoutes);
app.use("/api/pooja", poojaRoutes);
app.use("/api/booking/pooja", poojaBookingRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/calls", callRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai-chat", aiChatRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/kundali", kundaliRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
    res.send("API Running Vivek Start Project ");
});

// Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} with Socket.io`);
});
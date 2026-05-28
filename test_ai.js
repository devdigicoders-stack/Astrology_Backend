const axios = require('axios');

async function testAIChat() {
    try {
        const phone = "9999999998"; // using a new number just to be safe
        
        console.log("1. Registering/Logging in test user...");
        // 1. We skip send-otp because verify-otp accepts '123456' as a mock OTP for any number!
        const authRes = await axios.post('http://localhost:5000/api/user/verify-otp', {
            phoneNumber: phone,
            otp: "123456",
            name: "AI Test User",
            email: "aitest@example.com"
        });
        
        const token = authRes.data.token;
        console.log("-> Login successful. Token received.");
        
        console.log("\n2. Calling AI Chat Endpoint...");
        const aiRes = await axios.post('http://localhost:5000/api/ai-chat/send', {
            message: "Mera aaj ka din kaisa rahega? Main thoda stress me hoon."
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log("\n====== AI RESPONSE ======");
        console.log(aiRes.data.data.aiResponse);
        console.log("=========================");
        
        console.log("\nRemaining Free Limit:", aiRes.data.data.freeLimitRemaining);
        console.log("Wallet Balance:", aiRes.data.data.walletBalanceRemaining);

    } catch (e) {
        console.log("Error status:", e.response?.status);
        console.log("Error data:", e.response?.data || e.message);
    }
}
testAIChat();

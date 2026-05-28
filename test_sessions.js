const axios = require('axios');

async function testSessions() {
    try {
        const phone = "9999999998"; 
        
        console.log("1. Logging in...");
        const authRes = await axios.post('http://localhost:5000/api/user/verify-otp', {
            phoneNumber: phone,
            otp: "123456",
            name: "Session Test User",
            email: "sessiontest@example.com"
        });
        const token = authRes.data.token;
        
        console.log("\n2. Sending First Message (New Session)");
        const msg1Res = await axios.post('http://localhost:5000/api/ai-chat/send', {
            message: "I am having relationship issues."
        }, { headers: { Authorization: `Bearer ${token}` } });
        
        const sessionId1 = msg1Res.data.data.sessionId;
        console.log("Session ID 1:", sessionId1);
        console.log("Session Title 1:", msg1Res.data.data.sessionTitle);

        console.log("\n3. Sending Second Message (Same Session)");
        const msg2Res = await axios.post('http://localhost:5000/api/ai-chat/send', {
            message: "What should I do?",
            sessionId: sessionId1
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log("Session ID (Same):", msg2Res.data.data.sessionId);

        console.log("\n4. Sending Third Message (New Session 2)");
        const msg3Res = await axios.post('http://localhost:5000/api/ai-chat/send', {
            message: "I want to start a new business."
        }, { headers: { Authorization: `Bearer ${token}` } });
        
        const sessionId2 = msg3Res.data.data.sessionId;
        console.log("Session ID 2:", sessionId2);

        console.log("\n5. Fetching All Sessions List");
        const sessionsRes = await axios.get('http://localhost:5000/api/ai-chat/sessions', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Sessions:", sessionsRes.data.data);

        console.log("\n6. Fetching History for Session 1");
        const historyRes = await axios.get(`http://localhost:5000/api/ai-chat/history/${sessionId1}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`History count for ${sessionId1}:`, historyRes.data.data.length);

    } catch (e) {
        console.error("Test failed with error:", e);
    }
}
testSessions();

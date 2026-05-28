const axios = require('axios');

async function test() {
    try {
        const res = await axios.post('http://localhost:5000/api/astrologer/register', {
            name: "Test Astro",
            phoneNumber: "1111111111",
            email: "test@astro.com",
            pricing: { chatRate: 10, audioCallRate: 10, videoCallRate: 10, kundaliRate: 10 }
        });
        console.log("Success:", res.data);
    } catch (e) {
        console.log("Error status:", e.response?.status);
        console.log("Error data:", e.response?.data);
    }
}
test();

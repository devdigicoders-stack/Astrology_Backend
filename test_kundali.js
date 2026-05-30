const axios = require("axios");

async function testKundali() {
    try {
        const response = await axios.post("http://localhost:5000/api/kundali/generate", {
            day: 10,
            month: 8,
            year: 1995,
            hour: 14,
            min: 30,
            lat: 28.6139,
            lon: 77.2090,
            tzone: 5.5
        }, {
            headers: {
                "Content-Type": "application/json"
            }
        });

        console.log("Response Status:", response.status);
        console.log("Response Data:", JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error("Test Error:", error.response?.data || error.message);
    }
}

testKundali();

const axios = require('axios');

async function test() {
    try {
        const res = await axios.patch('http://localhost:5000/api/astrologer/6a142e2f1531003b003d2f5e/verify');
        console.log(res.data);
    } catch (e) {
        console.log("Error status:", e.response?.status);
        console.log("Error data:", e.response?.data);
    }
}
test();

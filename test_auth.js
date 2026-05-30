const axios = require("axios");

const token = "ak-2e6e1ef1224c9bbf85f084c284b540f0438c9936";
const requestBody = { day: 10, month: 8, year: 1995, hour: 14, min: 30, lat: 28.6139, lon: 77.2090, tzone: 5.5 };
const url = "https://json.astrologyapi.com/v1/planets";

async function testHeader(headerObj, name) {
    try {
        const response = await axios.post(url, requestBody, { headers: headerObj });
        console.log(`[SUCCESS] with ${name}`);
        return true;
    } catch (e) {
        console.log(`[FAIL] with ${name}: ${e.response?.data?.msg || e.message}`);
        return false;
    }
}

async function run() {
    await testHeader({ "Authorization": `Bearer ${token}` }, "Bearer Token");
    await testHeader({ "Authorization": `Token ${token}` }, "Token Auth");
    await testHeader({ "Authorization": token }, "Raw Token");
    await testHeader({ "x-api-key": token }, "x-api-key");
    await testHeader({ "apikey": token }, "apikey");
}
run();

const axios = require("axios");

const token = "ak-2e6e1ef1224c9bbf85f084c284b540f0438c9936";
const requestBody = { day: 10, month: 8, year: 1995, hour: 14, min: 30, lat: 28.6139, lon: 77.2090, tzone: 5.5 };

const endpoints = [
    "https://json.astrologyapi.com/v1/planets",
    "https://api.astrologyapi.com/v1/planets",
    "https://api.vedicastroapi.com/v3-json/horoscope/planet-details"
];

const headers = [
    { "Authorization": `Bearer ${token}` },
    { "Authorization": token },
    { "x-api-key": token },
    { "Authorization": `Basic ${Buffer.from(":" + token).toString("base64")}` } // Basic auth with just token
];

async function run() {
    for (let url of endpoints) {
        for (let header of headers) {
            try {
                // If it's vedicastroapi, it requires query param usually but let's test body
                let reqUrl = url;
                if (url.includes("vedicastroapi")) {
                    reqUrl = `${url}?api_key=${token}&dob=10/08/1995&tob=14:30&lat=28.6139&lon=77.2090&tz=5.5`;
                }
                
                const response = await axios.post(reqUrl, requestBody, { headers: header });
                console.log(`[SUCCESS] URL: ${url} | Header: ${JSON.stringify(header)}`);
            } catch (e) {
                console.log(`[FAIL] URL: ${url} | Header: ${Object.keys(header)[0]} => ${e.response?.data?.msg || e.response?.data?.message || e.message}`);
            }
        }
    }
}
run();

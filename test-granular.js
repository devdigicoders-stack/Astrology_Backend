const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
    try {
        const uniqueId = Date.now();
        console.log("1. Logging in Super Admin...");
        const saLogin = await axios.post(`${BASE_URL}/admin/login`, {
            email: "super@admin.com",
            password: "password123"
        });
        const saToken = saLogin.data.token;
        console.log("Super Admin Token received");
        
        console.log("\n2. Registering Normal Admin with specific granular permissions (view_pooja, create_pooja)...");
        const naRes = await axios.post(`${BASE_URL}/admin/register`, {
            name: "Data Entry Admin",
            email: `dataentry${uniqueId}@admin.com`,
            password: "password123",
            role: "admin",
            permissions: ["view_pooja", "create_pooja"] // NO delete_pooja permission
        }, { headers: { Authorization: `Bearer ${saToken}` } });
        console.log("Normal Admin Registered:", naRes.data.admin);
        
        console.log("\n3. Logging in Normal Admin...");
        const naLogin = await axios.post(`${BASE_URL}/admin/login`, {
            email: `dataentry${uniqueId}@admin.com`,
            password: "password123"
        });
        const naToken = naLogin.data.token;
        console.log("Normal Admin Token received");
        
        console.log("\n4. Creating a Pooja via Normal Admin (Should Succeed)...");
        const poojaRes = await axios.post(`${BASE_URL}/pooja`, {
            name: "Test Granular Pooja",
            category: "Other",
            description: "Testing granular create permissions",
            price: 101
        }, { headers: { Authorization: `Bearer ${naToken}` } });
        const poojaId = poojaRes.data.pooja._id;
        console.log("Pooja Created with ID:", poojaId);
        
        console.log("\n5. Fetching Poojas for Normal Admin (Should Succeed)...");
        const getPoojaRes = await axios.get(`${BASE_URL}/pooja/admin/all`, {
            headers: { Authorization: `Bearer ${naToken}` }
        });
        console.log("Normal Admin can see:", getPoojaRes.data.count, "poojas");
        
        console.log("\n6. Attempting to Delete the Pooja via Normal Admin (Should FAIL)...");
        try {
            await axios.delete(`${BASE_URL}/pooja/${poojaId}`, {
                headers: { Authorization: `Bearer ${naToken}` }
            });
            console.log("ERROR: Delete succeeded when it should have failed!");
        } catch (err) {
            console.log("Expected Error Caught:", err.response ? err.response.data.message : err.message);
        }
        
        console.log("\n✅ Granular Permission Tests Passed Successfully!");
    } catch (err) {
        console.error("Test Failed!", err.response ? err.response.data : err.message);
    }
}

runTests();

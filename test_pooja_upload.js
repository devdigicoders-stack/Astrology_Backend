const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

async function testPoojaUpload() {
    await mongoose.connect("mongodb://localhost:27017/Astolargry");
    const db = mongoose.connection.db;

    // 1. Generate SuperAdmin token from real DB admin
    const admin = await db.collection("admins").findOne();
    if (!admin) {
        console.log("No admin found in DB.");
        mongoose.connection.close();
        return;
    }

    const token = jwt.sign(
        { id: admin._id.toString(), role: "superadmin" },
        "fallback_secret_key", // assuming server is using fallback
        { expiresIn: "1h" }
    );

    // 2. Create a dummy image
    const imagePath = path.join(__dirname, 'dummy_pooja.png');
    fs.writeFileSync(imagePath, 'dummy pooja image content');

    // 3. Create FormData boundary and payload
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    let data = '';

    // Append fields
    const fields = {
        name: 'Test Diwali Pooja',
        category: 'Wealth',
        description: 'Maha laxmi pooja for wealth',
        price: '1100'
    };

    for (const [key, value] of Object.entries(fields)) {
        data += `--${boundary}\r\n`;
        data += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
        data += `${value}\r\n`;
    }

    // Append file
    data += `--${boundary}\r\n`;
    data += `Content-Disposition: form-data; name="image"; filename="dummy_pooja.png"\r\n`;
    data += `Content-Type: image/png\r\n\r\n`;
    data += fs.readFileSync(imagePath, 'binary') + '\r\n';
    data += `--${boundary}--\r\n`;

    // 4. Send request
    try {
        const response = await fetch('http://localhost:5000/api/pooja', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: Buffer.from(data, 'binary')
        });

        const json = await response.json();
        console.log("Response:", json);

        if (json.success) {
            console.log("\n✅ SUCCESS! Pooja was created and image saved as:", json.pooja.image);
        } else {
            console.log("\n❌ FAILED!", json.message);
        }
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        fs.unlinkSync(imagePath);
        mongoose.connection.close();
    }
}

testPoojaUpload();

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

async function testProductUpload() {
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
    const imagePath = path.join(__dirname, 'dummy_product.png');
    fs.writeFileSync(imagePath, 'dummy product image content');

    // 3. Create FormData boundary and payload
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    let data = '';

    // Append fields
    const fields = {
        name: 'Test Rudraksha',
        category: 'Rudraksha',
        description: 'Original 5 mukhi rudraksha',
        price: '500',
        stock: '10'
    };

    for (const [key, value] of Object.entries(fields)) {
        data += `--${boundary}\r\n`;
        data += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
        data += `${value}\r\n`;
    }

    // Append 2 files for the array test
    data += `--${boundary}\r\n`;
    data += `Content-Disposition: form-data; name="images"; filename="dummy_product_1.png"\r\n`;
    data += `Content-Type: image/png\r\n\r\n`;
    data += fs.readFileSync(imagePath, 'binary') + '\r\n';
    
    data += `--${boundary}\r\n`;
    data += `Content-Disposition: form-data; name="images"; filename="dummy_product_2.png"\r\n`;
    data += `Content-Type: image/png\r\n\r\n`;
    data += fs.readFileSync(imagePath, 'binary') + '\r\n';
    
    data += `--${boundary}--\r\n`;

    // 4. Send request
    try {
        const response = await fetch('http://localhost:5000/api/products', {
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
            console.log("\n✅ SUCCESS! Product was created and images saved as:", json.product.images);
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

testProductUpload();

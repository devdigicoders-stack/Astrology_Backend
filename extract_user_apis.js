const fs = require('fs');

const data = JSON.parse(fs.readFileSync('Asolargery_Postman_Collection.json', 'utf8'));

// We want to extract only the User APIs.
// This means we look inside each module folder and filter the items.
// A User API typically has "[User]", "[Public] /api/user", "[Shared" or similar in its name.

const userItems = [];

data.item.forEach(moduleItem => {
    if (moduleItem.item) {
        const filteredModuleItems = moduleItem.item.filter(api => {
            const name = api.name || "";
            // Include if it explicitly mentions [User] or [Shared]
            if (name.includes("[User]") || name.includes("[Shared") || name.includes("[Shared/Any]")) return true;
            // Include if it's public and starts with /api/user
            if (name.includes("[Public]") && name.includes("/api/user")) return true;
            return false;
        });

        if (filteredModuleItems.length > 0) {
            userItems.push({
                name: moduleItem.name,
                item: filteredModuleItems
            });
        }
    }
});

const userCollection = {
    info: {
        name: "Astrology User Panel APIs",
        description: "Collection containing all User/Customer APIs (~40) with body parameters and token authorization.",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: userItems
};

fs.writeFileSync('User_Panel_Postman_Collection.json', JSON.stringify(userCollection, null, 2));
console.log("Created User_Panel_Postman_Collection.json with " + userItems.reduce((acc, module) => acc + module.item.length, 0) + " APIs.");

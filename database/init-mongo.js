// FinPocket MongoDB Initialization Script
// Run: mongosh "mongodb+srv://<cluster>.mongodb.net/" --file init-mongo.js

use("finpocket_db");

// Create users collection with indexes
db.createCollection("users");
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });
db.users.createIndex({ "createdAt": -1 });

print("FinPocket database initialized successfully.");
print("Note: Admin account is created automatically on first application startup.");

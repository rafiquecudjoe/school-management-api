/**
 * Drop all test-created documents from MongoDB collections.
 * Run after tests: node tests/_helpers/cleanup.js
 *
 * Uses the same MONGO_URI from .env so it targets the correct database.
 */
require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI =
    process.env.MONGO_URI || "mongodb://localhost:27017/axion";

async function cleanup() {
    console.log(`Connecting to ${MONGO_URI} …`);
    await mongoose.connect(MONGO_URI);

    const db = mongoose.connection.db;
    const collections = ["students", "classrooms", "schools", "users", "student_transfers"];

    for (const name of collections) {
        const coll = db.collection(name);
        const count = await coll.countDocuments();
        if (count > 0) {
            await coll.deleteMany({});
            console.log(`  ✓ ${name}: deleted ${count} documents`);
        } else {
            console.log(`  - ${name}: already empty`);
        }
    }

    await mongoose.disconnect();
    console.log("Cleanup complete.");
}

cleanup().catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
});

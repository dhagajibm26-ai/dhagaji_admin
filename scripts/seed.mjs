/**
 * seed.mjs — One-time setup script.
 * Creates the owner account in local MongoDB.
 *
 * Usage:
 *   node scripts/seed.mjs
 *
 * Run only once. Safe to re-run — it skips if owner already exists.
 */

import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is missing. Set it in your environment.");
  process.exit(1);
}

// ── Owner credentials (change password after first login) ────────────────────
const OWNER = {
  name: process.env.OWNER_NAME || "Dhagaji Owner",
  email: process.env.OWNER_EMAIL || "owner@dhagaji.local",
  password: process.env.OWNER_PASSWORD || "Dhagaji@123", // change immediately
  role: "owner",
  isActive: true,
  loginAttempts: 0,
  lockUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function seed() {
  console.log("🔌 Connecting to MongoDB...");
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  const users = db.collection("users");

  // Check if owner already exists
  const existing = await users.findOne({ email: OWNER.email });
  if (existing) {
    console.log("✅ Owner already exists — skipping.");
    await client.close();
    return;
  }

  // Hash password
  const hashed = await bcrypt.hash(OWNER.password, 12);

  await users.insertOne({ ...OWNER, password: hashed });
  console.log("✅ Owner created!");
  console.log("   Email   :", OWNER.email);
  console.log("   Password:", OWNER.password);
  console.log("   ⚠️  Change the password after first login.");

  // Create indexes
  await users.createIndex({ email: 1 }, { unique: true });
  console.log("✅ Indexes created.");

  await client.close();
  console.log("Done.");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});

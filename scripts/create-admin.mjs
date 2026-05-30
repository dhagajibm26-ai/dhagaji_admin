/**
 * create-admin.mjs — Production admin/staff user creator.
 *
 * Usage (run locally against production Atlas):
 *
 *   node scripts/create-admin.mjs \
 *     --email admin@dhagaji.com \
 *     --password "StrongPass@123" \
 *     --name "Dhagaji Admin" \
 *     --role owner
 *
 *   Roles: owner | staff
 *   Safe to re-run — skips if email already exists.
 *
 * The script reads MONGODB_URI from environment.
 * Set it before running:
 *   export MONGODB_URI="mongodb+srv://..."
 *   node scripts/create-admin.mjs --email ... --password ...
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ── Parse CLI arguments ──────────────────────────────────────────────────────
function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : null;
}

const email    = getArg("email");
const password = getArg("password");
const name     = getArg("name") || "Dhagaji Owner";
const role     = getArg("role") || "owner";

if (!email || !password) {
  console.error("❌  Usage: node scripts/create-admin.mjs --email <email> --password <password> [--name <name>] [--role owner|staff]");
  process.exit(1);
}

if (!["owner", "staff"].includes(role)) {
  console.error("❌  --role must be 'owner' or 'staff'");
  process.exit(1);
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI env variable is missing.");
  console.error("    Export it first:  export MONGODB_URI=\"mongodb+srv://...\"");
  process.exit(1);
}

// ── Create user ──────────────────────────────────────────────────────────────
async function createAdmin() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);

  const db    = mongoose.connection.db;
  const users = db.collection("users");

  // Ensure email unique index exists
  await users.createIndex({ email: 1 }, { unique: true });

  const existing = await users.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log(`✅ User already exists (${email}) — skipping.`);
    await mongoose.disconnect();
    return;
  }

  const hashed = await bcrypt.hash(password, 12);

  await users.insertOne({
    name,
    email: email.toLowerCase(),
    password: hashed,
    role,
    isActive: true,
    loginAttempts: 0,
    lockUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("✅ User created successfully!");
  console.log("   Name    :", name);
  console.log("   Email   :", email);
  console.log("   Role    :", role);
  console.log("   ⚠️  Change the password after first login.");

  await mongoose.disconnect();
  console.log("Done.");
}

createAdmin().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});

/**
 * ensureOwnerFromEnv — creates the first owner from env vars if missing.
 *
 * Set in Vercel / .env.production:
 *   OWNER_EMAIL, OWNER_PASSWORD, OWNER_NAME (optional)
 *
 * Safe to call repeatedly — runs at most once per cold start and skips
 * when the owner email already exists.
 */
import bcrypt from "bcryptjs";
import { User } from "@/models/User";

declare global {
  // eslint-disable-next-line no-var
  var __ownerEnsured: boolean | undefined;
}

export async function ensureOwnerFromEnv(): Promise<void> {
  if (global.__ownerEnsured) return;

  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;

  if (!email || !password) {
    global.__ownerEnsured = true;
    return;
  }

  try {
    const existing = await User.findOne({ email }).select("_id");
    if (existing) {
      global.__ownerEnsured = true;
      return;
    }

    await User.create({
      name: process.env.OWNER_NAME?.trim() || "Dhagaji Owner",
      email,
      password: await bcrypt.hash(password, 12),
      role: "owner",
      isActive: true,
      loginAttempts: 0,
      lockUntil: null,
    });

    global.__ownerEnsured = true;
    console.info(`[ensureOwner] Created owner account for ${email}`);
  } catch (err) {
    console.error("[ensureOwner] Failed to ensure owner:", err);
    // leave flag unset so the next cold/warm request can retry
  }
}

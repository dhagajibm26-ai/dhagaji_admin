/**
 * auth.ts — Full NextAuth configuration (Node.js runtime only).
 *
 * Spreads the Edge-safe authConfig and adds the Credentials provider
 * which uses Mongoose and bcrypt (Node.js-only dependencies).
 */
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { loginSchema } from "@/types";
import { authConfig } from "./auth.config";

// ─── Custom error classes ─────────────────────────────────────────────────────
// These codes surface in result.error on the client after a failed signIn().

class AccountLockedError extends CredentialsSignin {
  code = "account_locked";
}

class AccountInactiveError extends CredentialsSignin {
  code = "account_inactive";
}

class InvalidEmailError extends CredentialsSignin {
  code = "invalid_email";
}

class InvalidPasswordError extends CredentialsSignin {
  code = "invalid_password";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 60 * 60 * 1000; // 1 hour

// ─── NextAuth instance ────────────────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) throw new InvalidEmailError();

        await connectDB();

        // Fetch user with all security-sensitive fields (select: false by default)
        const user = await User.findOne({ email: parsed.data.username }).select(
          "+password +loginAttempts +lockUntil +lastLogin"
        );

        if (!user) {
          // Constant-time delay to prevent user-enumeration via timing
          await new Promise((r) =>
            setTimeout(r, 300 + Math.random() * 200)
          );
          throw new InvalidEmailError();
        }

        if (!user.isActive) throw new AccountInactiveError();

        // ── Account lockout check ────────────────────────────────────────────
        if (user.lockUntil && user.lockUntil > new Date()) {
          throw new AccountLockedError();
        }

        // ── Password verification ────────────────────────────────────────────
        const { default: bcrypt } = await import("bcryptjs");
        const isValid = await bcrypt.compare(
          parsed.data.password,
          user.password
        );

        if (!isValid) {
          const attempts = (user.loginAttempts ?? 0) + 1;
          const shouldLock = attempts >= MAX_ATTEMPTS;
          await User.updateOne(
            { _id: user._id },
            {
              loginAttempts: shouldLock ? 0 : attempts,
              lockUntil: shouldLock
                ? new Date(Date.now() + LOCK_DURATION_MS)
                : null,
            }
          );
          throw new InvalidPasswordError();
        }

        // ── Success — reset lockout state ────────────────────────────────────
        await User.updateOne(
          { _id: user._id },
          { $set: { loginAttempts: 0, lockUntil: null, lastLogin: new Date() } }
        );

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});

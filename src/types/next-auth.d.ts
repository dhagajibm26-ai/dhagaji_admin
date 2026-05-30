/**
 * types/next-auth.d.ts — Augments next-auth's Session, User, and JWT
 * interfaces with application-specific fields.
 *
 * TypeScript merges these with the library's base types project-wide.
 */
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** MongoDB ObjectId string */
      id: string;
      role: "owner" | "staff";
    } & DefaultSession["user"];
  }

  /** Returned by the authorize() callback and seeded into the JWT */
  interface User {
    role: "owner" | "staff";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** MongoDB ObjectId string */
    id: string;
    role: "owner" | "staff";
    /** Unix ms timestamp — used for the inactivity sliding window */
    lastActivity: number;
  }
}

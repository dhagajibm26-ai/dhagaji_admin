/**
 * auth.config.ts — Edge-safe NextAuth configuration.
 *
 * This file must NOT import any Node.js-only modules (mongoose, bcrypt, fs …).
 * It is used by both:
 *   • middleware.ts  → runs in the Edge runtime
 *   • auth.ts        → runs in the Node.js runtime (spreads this config and
 *                       adds the Credentials provider)
 */
import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

/** Sliding-window inactivity period — 30 minutes */
const INACTIVITY_MS = 30 * 60 * 1000;

export const authConfig = {
  // Required for custom domains (e.g. admin.dhagajicreation.com)
  trustHost: true,
  // Prefer AUTH_SECRET; keep NEXTAUTH_SECRET as fallback for Vercel misconfig
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 60,  // Absolute ceiling (seconds)
    updateAge: 0,      // Re-sign the cookie on every request → sliding window
  },
  callbacks: {
    /**
     * authorized — called by the Edge middleware on every matched request.
     * Returns:
     *   • true / NextResponse.next()  → proceed (handler in middleware.ts runs)
     *   • false                       → redirect to /login automatically
     *   • NextResponse.redirect()     → custom redirect
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // Always allow next-auth's own API routes + public health check
      if (pathname.startsWith("/api/auth")) return true;
      if (pathname === "/api/health") return true;

      // Login page: redirect authenticated users to dashboard
      if (pathname === "/login") {
        if (isLoggedIn) return NextResponse.redirect(new URL("/", nextUrl));
        return true;
      }

      // Unauthenticated → next-auth redirects to /login?callbackUrl=...
      if (!isLoggedIn) return false;

      // Role guard: staff may not view /reports → send to /billing
      if (auth.user.role === "staff" && pathname.startsWith("/reports")) {
        return NextResponse.redirect(new URL("/billing", nextUrl));
      }

      // Dashboard (/) is owner-only — redirect staff to billing
      if (auth.user.role === "staff" && pathname === "/") {
        return NextResponse.redirect(new URL("/billing", nextUrl));
      }

      return true;
    },

    /**
     * jwt — runs on every token read/write (both Edge and Node.js).
     * Handles:
     *   • Initial sign-in: seeds id, role, lastActivity
     *   • Subsequent requests: inactivity check + sliding-window update
     */
    jwt({ token, user }) {
      if (user) {
        // Initial sign-in — user object comes from authorize()
        token.id = user.id as string;
        token.role = (user as { role: "owner" | "staff" }).role;
        token.lastActivity = Date.now();
        return token;
      }

      // Inactivity check
      const lastActivity = (token.lastActivity as number | undefined) ?? 0;
      if (Date.now() - lastActivity > INACTIVITY_MS) {
        // Returning null invalidates the session → user is logged out
        return null;
      }

      // Slide the window
      token.lastActivity = Date.now();
      return token;
    },

    /** session — maps JWT claims → session.user for client consumption */
    session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as "owner" | "staff";
      }
      return session;
    },
  },
  providers: [], // Populated in auth.ts (Node.js only)
} satisfies NextAuthConfig;

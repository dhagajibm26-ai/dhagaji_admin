/**
 * proxy.ts — Edge-runtime route guard.
 *
 * Uses NextAuth(authConfig) — NO Node.js-only imports allowed here.
 * Route protection logic lives in authConfig.callbacks.authorized.
 * This handler only runs when authorized() returns true, and injects
 * the user identity into request headers for downstream API routes.
 */
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

// Build a lightweight NextAuth instance from the Edge-safe config
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const session = req.auth;

  // Forward user identity as request headers so API route handlers
  // can read the role without calling auth() themselves.
  const requestHeaders = new Headers(req.headers);
  if (session?.user) {
    requestHeaders.set("x-user-id", session.user.id ?? "");
    requestHeaders.set("x-user-role", session.user.role ?? "");
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
});

export const config = {
  // Include all routes except: next-auth internals, static assets, imagess
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

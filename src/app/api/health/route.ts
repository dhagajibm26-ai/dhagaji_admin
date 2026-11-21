import { NextResponse } from "next/server";

/**
 * Public health check — does NOT expose secret values.
 * Use to verify Vercel Production env is wired correctly.
 */
export async function GET() {
  const hasAuthSecret = Boolean(
    process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  );
  const hasMongo = Boolean(process.env.MONGODB_URI);
  const hasAuthUrl = Boolean(process.env.AUTH_URL || process.env.NEXTAUTH_URL);
  const hasOwner = Boolean(
    process.env.OWNER_EMAIL && process.env.OWNER_PASSWORD
  );

  const ok = hasAuthSecret && hasMongo;

  return NextResponse.json(
    {
      ok,
      host: process.env.AUTH_URL || null,
      env: {
        AUTH_SECRET: hasAuthSecret,
        MONGODB_URI: hasMongo,
        AUTH_URL: hasAuthUrl,
        OWNER_EMAIL: hasOwner,
        AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST === "true",
      },
    },
    { status: ok ? 200 : 503 }
  );
}

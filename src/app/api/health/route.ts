import { NextResponse } from "next/server";

/**
 * Public health check — does NOT expose secret values.
 * Use to verify Vercel Production env + Mongo connectivity.
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

  let mongo: { ok: boolean; error?: string } = { ok: false };
  if (hasMongo) {
    try {
      const { connectDB } = await import("@/lib/mongodb");
      await connectDB();
      mongo = { ok: true };
    } catch (err) {
      mongo = {
        ok: false,
        error: err instanceof Error ? err.message : "mongo_connect_failed",
      };
    }
  }

  const ok = hasAuthSecret && hasMongo && mongo.ok;

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
      mongo,
    },
    { status: ok ? 200 : 503 }
  );
}

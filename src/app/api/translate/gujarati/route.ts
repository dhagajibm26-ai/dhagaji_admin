import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { ApiResponse } from "@/types";

async function runTranslate(text: string) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=gu&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return "";
  const json = (await res.json()) as unknown;
  if (!Array.isArray(json) || !Array.isArray(json[0])) return "";

  const tokens = (json[0] as unknown[])
    .filter((row) => Array.isArray(row) && typeof row[0] === "string")
    .map((row) => (row as string[])[0]);

  return tokens.join("").trim();
}

function getTextFromRequest(request: Request, body: { text?: string } | null) {
  if (body?.text && body.text.trim()) return body.text.trim();
  const { searchParams } = new URL(request.url);
  return searchParams.get("q")?.trim() ?? "";
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const text = getTextFromRequest(request, null);
    if (!text) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Text is required" }, { status: 400 });
    }

    const translatedText = await runTranslate(text);
    return NextResponse.json<ApiResponse>({ success: true, data: { translatedText } });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as { text?: string } | null;
    const text = getTextFromRequest(request, body);
    if (!text) {
      return NextResponse.json<ApiResponse>({ success: false, error: "Text is required" }, { status: 400 });
    }

    const translatedText = await runTranslate(text);
    return NextResponse.json<ApiResponse>({ success: true, data: { translatedText } });
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

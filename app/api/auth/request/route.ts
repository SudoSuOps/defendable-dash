import { NextResponse } from "next/server";
import { CLOUD_BASE } from "@/lib/config";

export const runtime = "edge";

// Proxy the magic-link request to the cloud. No session needed (pre-auth).
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  if (!body.email) {
    return NextResponse.json({ ok: false, error: "email required" }, { status: 400 });
  }

  const res = await fetch(`${CLOUD_BASE}/auth/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return NextResponse.json(data, { status: res.status });
}

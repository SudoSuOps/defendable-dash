import { NextResponse } from "next/server";
import { CLOUD_BASE, SESSION_COOKIE } from "@/lib/config";
import type { AuthVerifyResponse } from "@/lib/types";

export const runtime = "edge";

// Verify the magic-link token with the cloud. On success, set the dash_jwt
// httpOnly secure cookie with the member access_token and return {ok,user}.
export async function POST(req: Request) {
  let body: { token?: string };
  try {
    body = (await req.json()) as { token?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  if (!body.token) {
    return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });
  }

  const res = await fetch(`${CLOUD_BASE}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: body.token }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    return NextResponse.json({ ok: false, error: detail.slice(0, 300) }, { status: res.status });
  }

  const data = (await res.json()) as AuthVerifyResponse;
  if (!data.access_token) {
    return NextResponse.json({ ok: false, error: "no access_token returned" }, { status: 502 });
  }

  const out = NextResponse.json({ ok: true, user: data.user });
  out.cookies.set(SESSION_COOKIE, data.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return out;
}

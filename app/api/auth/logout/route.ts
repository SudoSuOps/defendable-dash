import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/config";

export const runtime = "edge";

// Clear the session cookie. The cloud JWT is stateless; dropping the cookie signs out.
export async function POST() {
  const out = NextResponse.json({ ok: true });
  out.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return out;
}

// Server-side auth helpers. The session is the dash_jwt httpOnly cookie set by
// /api/auth/verify; the member JWT inside it is what cloudFetch forwards as Bearer.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cloudFetch } from "./cloud";
import { SESSION_COOKIE } from "./config";
import type { Me } from "./types";

/** Read the raw session JWT, or null if not signed in. */
export async function getSession(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value || null;
}

/** Guard a server component / page: redirect to /login when there's no session. */
export async function requireMember(): Promise<string> {
  const token = await getSession();
  if (!token) redirect("/login");
  return token;
}

/** Resolve the signed-in member from the cloud. Returns null when unauthenticated. */
export async function getMe(): Promise<Me | null> {
  const token = await getSession();
  if (!token) return null;
  try {
    return await cloudFetch<Me>("/auth/me");
  } catch {
    return null; // stale/invalid token — caller decides whether to redirect
  }
}

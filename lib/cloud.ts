// Server-side BFF helpers — the ONLY place that talks to the backends.
// Holds no client secrets: the member JWT comes from the session cookie,
// the router token from CF Pages env. Runs on the edge (route handlers).
import { cookies } from "next/headers";
import { CLOUD_BASE, ROUTER_BASE, ROUTER_TOKEN, SESSION_COOKIE } from "./config";

export class BackendError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function sessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value || null;
}

/** Call the DefendableCloud API as the signed-in member (org-scoped by the JWT). */
export async function cloudFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await sessionToken();
  const res = await fetch(`${CLOUD_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new BackendError(res.status, detail.slice(0, 300));
  }
  return res.json() as Promise<T>;
}

/** Call the DefendableRouter (sovereign, server-to-server). Returns null if not configured. */
export async function routerFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!ROUTER_BASE) return null;
  try {
    const res = await fetch(`${ROUTER_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(ROUTER_TOKEN ? { Authorization: `Bearer ${ROUTER_TOKEN}` } : {}),
        ...(init?.headers || {}),
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // router is sovereign/optional; the dash degrades gracefully (honest, not fabricated)
  }
}

/** Forgiving cloud call: returns fallback instead of throwing (for the merge endpoints). */
export async function cloudSafe<T>(path: string, fallback: T): Promise<T> {
  try {
    return await cloudFetch<T>(path);
  } catch {
    return fallback;
  }
}

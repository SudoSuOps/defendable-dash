import { NextResponse } from "next/server";
import { cloudFetch, BackendError } from "@/lib/cloud";
import type { Cook } from "@/lib/types";

export const runtime = "edge";

// List the org's cooks (member JWT scopes to org). The cloud /cooks endpoint may return
// either a bare array or { cooks: [...] } — normalize to an array so the page narrows cleanly.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = url.searchParams.get("limit");
  const qs = limit ? `?limit=${encodeURIComponent(limit)}` : "";
  try {
    const data = await cloudFetch<Cook[] | { cooks: Cook[] }>(`/cooks${qs}`);
    const cooks = Array.isArray(data) ? data : (data.cooks ?? []);
    return NextResponse.json({ cooks });
  } catch (err) {
    const status = err instanceof BackendError ? err.status : 502;
    return NextResponse.json(
      { cooks: [], error: err instanceof Error ? err.message : "upstream error" },
      { status },
    );
  }
}

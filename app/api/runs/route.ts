import { NextResponse } from "next/server";
import { cloudFetch, BackendError } from "@/lib/cloud";
import type { Run } from "@/lib/types";

export const runtime = "edge";

// List the org's Defendable Runs (member JWT scopes to org). Pass through limit.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = url.searchParams.get("limit") || "50";
  try {
    const data = await cloudFetch<{ runs: Run[] }>(`/runs?limit=${encodeURIComponent(limit)}`);
    return NextResponse.json({ runs: data.runs ?? [] });
  } catch (err) {
    const status = err instanceof BackendError ? err.status : 502;
    return NextResponse.json(
      { runs: [], error: err instanceof Error ? err.message : "upstream error" },
      { status },
    );
  }
}

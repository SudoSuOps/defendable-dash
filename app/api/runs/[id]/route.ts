import { NextResponse } from "next/server";
import { cloudFetch, cloudSafe, BackendError } from "@/lib/cloud";
import type { RunDetail, Check, Verdict } from "@/lib/types";

export const runtime = "edge";

// Merge the full Defendable Run: base run + the referee checks + the verdict.
// The base run is required (404 if missing); checks/verdict degrade to honest
// empties so a half-graded run still renders its trace.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const [run, checksRes, verdict] = await Promise.all([
      cloudFetch<RunDetail>(`/runs/${encodeURIComponent(id)}`),
      cloudSafe<{ checks: Check[] }>(`/runs/${encodeURIComponent(id)}/checks`, { checks: [] }),
      cloudSafe<Verdict | null>(`/runs/${encodeURIComponent(id)}/verdict`, null),
    ]);

    // Prefer the dedicated checks/verdict endpoints; fall back to whatever the
    // base run object carried (some lanes inline them).
    const checks = checksRes.checks?.length ? checksRes.checks : run.checks ?? [];
    const mergedVerdict: Verdict | typeof run.verdict =
      verdict ?? run.verdict ?? null;

    const merged: RunDetail = { ...run, checks, verdict: mergedVerdict };
    return NextResponse.json(merged);
  } catch (err) {
    const status = err instanceof BackendError ? err.status : 502;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "upstream error" },
      { status },
    );
  }
}

import { NextResponse } from "next/server";
import { routerFetch } from "@/lib/cloud";
import type { FleetSummary, FleetWorker } from "@/lib/types";

export const runtime = "edge";

// Fleet telemetry — server-to-server to the sovereign DefendableRouter.
// routerFetch returns null when the router address isn't configured for this
// deployment; we surface that as `wired: false` and fabricate nothing.
export interface FleetResponse {
  wired: boolean;
  summary: FleetSummary | null;
  workers: FleetWorker[];
}

export async function GET() {
  const [summary, workers] = await Promise.all([
    routerFetch<FleetSummary>("/admin/summary"),
    routerFetch<FleetWorker[]>("/admin/workers"),
  ]);

  // The router is sovereign/optional. If summary is null the router is unwired;
  // workers may independently come back null on a partial error — default to [].
  const wired = summary !== null || workers !== null;

  return NextResponse.json<FleetResponse>({
    wired,
    summary: summary ?? null,
    workers: workers ?? [],
  });
}

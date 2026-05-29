import { NextResponse } from "next/server";
import { cloudSafe, routerFetch } from "@/lib/cloud";

export const runtime = "edge";

// Tier-3 command center data: merge cloud usage + recent receipts + router fleet summary.
export async function GET() {
  const [usage, receipts, fleet] = await Promise.all([
    cloudSafe<Record<string, unknown>>("/org/usage", {}),
    cloudSafe<{ rollups: unknown[] }>("/receipts/recent?limit=20", { rollups: [] }),
    routerFetch<Record<string, unknown>>("/admin/summary"),
  ]);

  return NextResponse.json({
    usage,
    recent_receipts: receipts.rollups ?? [],
    fleet, // null when the router isn't wired — shown honestly, never fabricated
  });
}

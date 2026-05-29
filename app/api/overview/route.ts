import { NextResponse } from "next/server";
import { cloudSafe, routerFetch } from "@/lib/cloud";
import { deriveOverview } from "@/lib/overview";
import type { FleetSummary, OrgUsage, ReceiptRollup } from "@/lib/types";

export const runtime = "edge";

// Tier-3 command center data: merge cloud usage + recent receipts + router fleet summary,
// then derive the verdict mix + flag rate honestly from the eval receipt summaries.
export async function GET() {
  const [usage, receipts, fleet] = await Promise.all([
    cloudSafe<Partial<OrgUsage>>("/org/usage", {}),
    cloudSafe<{ rollups: ReceiptRollup[] }>("/receipts/recent?limit=50", { rollups: [] }),
    routerFetch<FleetSummary>("/admin/summary"),
  ]);

  const rollups = receipts.rollups ?? [];

  return NextResponse.json({
    usage,
    recent_receipts: rollups,
    verdict_mix: deriveOverview(rollups),
    fleet, // null when the router isn't wired — shown honestly, never fabricated
  });
}

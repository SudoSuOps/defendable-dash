import { NextResponse } from "next/server";
import { cloudSafe, routerFetch } from "@/lib/cloud";
import type { Ledger, LedgerMerged, RouterReceipts } from "@/lib/types";

export const runtime = "edge";

// Merge the two hash chains the dash surfaces: the cloud org ledger (member JWT,
// org-scoped) and the sovereign router receipt chain (server-to-server). The router
// returns null when it isn't wired — we pass that through honestly rather than
// fabricating an empty chain that looks "verified".
export async function GET() {
  const [cloud, router] = await Promise.all([
    cloudSafe<Ledger>("/ledger", { entries: [] }),
    routerFetch<RouterReceipts>("/receipts"),
  ]);

  return NextResponse.json({
    cloud: { entries: cloud.entries ?? [] },
    router, // null = router not wired; the page shows an honest "not wired" section
  } satisfies LedgerMerged);
}

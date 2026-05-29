import { NextResponse } from "next/server";
import { cloudFetch, routerFetch, BackendError } from "@/lib/cloud";
import type { LedgerVerify, RouterVerify, LedgerVerifyCombined } from "@/lib/types";

export const runtime = "edge";

// Live ledger-integrity check — books-and-records you re-check, not trust.
// Recomputes BOTH hash chains: the cloud org chain (member JWT) and, when wired,
// the sovereign router receipt chain (server-to-server). Returns each result plus
// a single honest combined verdict.
//
// The top-level { ok, receipts_checked, errors } mirror the CLOUD chain so the
// Overview LedgerBadge keeps working unchanged. The page reads the richer
// cloud/router/router_wired breakdown.
//
// Honesty rules:
//  - router null  → router not wired; combined verdict reflects the cloud chain only.
//  - router wired → combined ok = cloud.ok && router.ok (one bad chain fails both).
//  - on cloud backend error we say so plainly; we never fabricate a "verified" chain.
export async function GET() {
  let cloud: LedgerVerify;
  let cloudStatus = 200;

  try {
    cloud = await cloudFetch<LedgerVerify>("/ledger/verify");
  } catch (err) {
    const status = err instanceof BackendError ? err.status : 502;
    cloudStatus = status === 401 ? 401 : 200;
    cloud = { ok: false, receipts_checked: 0, errors: ["cloud ledger verification unavailable"] };
  }

  // Router is sovereign/optional: routerFetch returns null when unwired or unreachable.
  const router = await routerFetch<RouterVerify>("/receipts/verify");
  const routerWired = router !== null;

  // Combined verdict: never claim "ok" without a chain actually verifying.
  // Unwired router is not a failure (honest absence), so it doesn't drag the
  // combined verdict — but a wired router that fails does.
  const combinedOk = cloud.ok && (router === null ? true : router.ok);

  const body: LedgerVerifyCombined = {
    // top-level = cloud view (badge backwards-compat), but ok = the combined verdict
    ok: combinedOk,
    receipts_checked: cloud.receipts_checked,
    errors: cloud.errors,
    cloud,
    router,
    router_wired: routerWired,
  };

  return NextResponse.json(body, { status: cloudStatus });
}

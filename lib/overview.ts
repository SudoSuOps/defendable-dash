// Pure derivations for the Overview command center.
// The verdict mix + flag rate are computed honestly from the eval receipt summaries —
// no fabrication: if there are no eval receipts, the counts are all zero and the
// page renders an honest empty state rather than inventing numbers.
import type { ReceiptRollup } from "./types";

export interface VerdictMix {
  honey: number; // pass
  jelly: number; // risk
  propolis: number; // fail
  eval_total: number; // eval receipts that carried a tier
  flagged: number; // jelly + propolis
  flag_rate: number; // flagged / eval_total, 0..1 (0 when no evals)
}

// Severity may arrive as the tier (honey/jelly/propolis) or, defensively, as the
// outcome (pass/risk/fail). We normalize to the tier so the math is unambiguous.
function tierOf(summary: ReceiptRollup["summary"]): "honey" | "jelly" | "propolis" | null {
  const sev = typeof summary.severity === "string" ? summary.severity.toLowerCase() : "";
  if (sev === "honey" || sev === "jelly" || sev === "propolis") return sev;

  const outcome = typeof summary.outcome === "string" ? summary.outcome.toLowerCase() : "";
  if (outcome === "pass") return "honey";
  if (outcome === "risk") return "jelly";
  if (outcome === "fail") return "propolis";
  return null;
}

export function deriveOverview(rollups: ReceiptRollup[]): VerdictMix {
  const mix: VerdictMix = {
    honey: 0,
    jelly: 0,
    propolis: 0,
    eval_total: 0,
    flagged: 0,
    flag_rate: 0,
  };

  for (const r of rollups) {
    if (!r.payload_schema?.startsWith("eval")) continue;
    const tier = tierOf(r.summary);
    if (!tier) continue;
    mix[tier] += 1;
    mix.eval_total += 1;
  }

  mix.flagged = mix.jelly + mix.propolis;
  mix.flag_rate = mix.eval_total > 0 ? mix.flagged / mix.eval_total : 0;
  return mix;
}

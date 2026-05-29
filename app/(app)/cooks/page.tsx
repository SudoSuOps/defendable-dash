// Cooks — the visible record of every fine-tune the org has run. Server component:
// reads the cloud as the signed-in member (session cookie → Bearer). Each cook shows
// base_model → dataset, status, eval_before → eval_after with the LIFT highlighted,
// pairs trained on, any reported metrics (train_loss, duration), and a link out to the
// cook's receipt or originating run. Honest empty state — no fabricated cooks.
import Link from "next/link";
import { cloudSafe } from "@/lib/cloud";
import { Badge, EmptyState } from "@/components/ui";
import type { Cook } from "@/lib/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// ── small formatters (no fabrication: a missing value renders as an em dash) ──
function fmtPct(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  // eval scores arrive 0–1 or 0–100 depending on the cook; treat ≤1 as a fraction.
  const v = Math.abs(n) <= 1 ? n * 100 : n;
  return `${v.toFixed(1)}`;
}

function fmtLift(n: number | undefined | null): { text: string; tone: string } {
  if (n === undefined || n === null || Number.isNaN(n)) {
    return { text: "—", tone: "text-paper/35" };
  }
  const v = Math.abs(n) <= 1 ? n * 100 : n;
  const sign = v > 0 ? "+" : "";
  const tone = v > 0 ? "text-emerald-300" : v < 0 ? "text-red-300" : "text-paper/60";
  return { text: `${sign}${v.toFixed(1)}`, tone };
}

function fmtInt(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US");
}

// Pull an optional metric out of the loose metrics blob and render it (or null to skip).
function metricNum(metrics: Record<string, unknown> | undefined, key: string): number | null {
  if (!metrics) return null;
  const v = metrics[key];
  return typeof v === "number" && !Number.isNaN(v) ? v : null;
}

function fmtDuration(seconds: number | null): string | null {
  if (seconds === null) return null;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default async function CooksPage() {
  const { cooks } = await cloudSafe<{ cooks: Cook[] }>("/cooks?limit=100", { cooks: [] });

  return (
    <div className="min-h-screen brand-grid">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="text-xs font-semibold uppercase tracking-widest text-honey-300/80">
          Sovereign Cooks
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-paper">Cooks</h1>
        <p className="mt-1 max-w-2xl text-sm text-paper/50">
          Every fine-tune run, with the eval before and after and the measured lift. The base model,
          the dataset, the pairs it trained on — and a receipt that proves it. No trust-me-bro
          numbers; if a metric wasn&apos;t recorded, we say so.
        </p>

        <div className="mt-8">
          {cooks.length === 0 ? (
            <EmptyState title="No cooks yet">
              When a base model is fine-tuned on a dataset, the cook lands here — eval before →
              after, the lift, and a hash-chained receipt linking back to the run. Nothing to
              fabricate.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {cooks.map((c) => {
                const lift = fmtLift(c.lift);
                const trainLoss = metricNum(c.metrics, "train_loss");
                const durationS =
                  metricNum(c.metrics, "duration") ?? metricNum(c.metrics, "duration_s");
                const duration = fmtDuration(durationS);

                return (
                  <div
                    key={c.id}
                    className="rounded-xl border border-white/8 bg-white/[0.02] px-5 py-4"
                  >
                    {/* header row: base model · dataset · status */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold tracking-tight text-paper">
                          {c.base_model || c.id}
                        </div>
                        <div className="mt-0.5 font-mono text-xs text-paper/45">
                          dataset:{" "}
                          {c.dataset_id ? (
                            <span className="text-paper/70">{c.dataset_id}</span>
                          ) : (
                            <span className="text-paper/35">—</span>
                          )}
                          <span className="text-paper/25"> · </span>
                          {c.id}
                        </div>
                      </div>
                      {c.status ? (
                        <Badge value={c.status} />
                      ) : (
                        <span className="font-mono text-xs text-paper/35">no status</span>
                      )}
                    </div>

                    {/* metric strip: eval before → after, lift, pairs, optional metrics */}
                    <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-sm">
                      <div>
                        <span className="text-xs uppercase tracking-widest text-paper/40">
                          eval
                        </span>
                        <div className="mt-0.5 flex items-baseline gap-1.5">
                          <span className="text-paper/60">{fmtPct(c.eval_before)}</span>
                          <span className="text-paper/30" aria-hidden="true">
                            →
                          </span>
                          <span className="text-paper">{fmtPct(c.eval_after)}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs uppercase tracking-widest text-paper/40">
                          lift
                        </span>
                        <div className={`mt-0.5 font-semibold ${lift.tone}`}>{lift.text}</div>
                      </div>

                      <div>
                        <span className="text-xs uppercase tracking-widest text-paper/40">
                          pairs
                        </span>
                        <div className="mt-0.5 text-paper/80">{fmtInt(c.pairs)}</div>
                      </div>

                      {trainLoss !== null && (
                        <div>
                          <span className="text-xs uppercase tracking-widest text-paper/40">
                            train_loss
                          </span>
                          <div className="mt-0.5 text-paper/80">{trainLoss.toFixed(4)}</div>
                        </div>
                      )}

                      {duration && (
                        <div>
                          <span className="text-xs uppercase tracking-widest text-paper/40">
                            duration
                          </span>
                          <div className="mt-0.5 text-paper/80">{duration}</div>
                        </div>
                      )}
                    </div>

                    {/* provenance: link to the receipt or the originating run */}
                    <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-white/5 pt-3 text-xs">
                      {c.receipt_id ? (
                        <Link
                          href={`/ledger#${c.receipt_id}`}
                          className="font-mono text-honey-300/90 hover:text-honey-200"
                        >
                          receipt: {c.receipt_id} →
                        </Link>
                      ) : (
                        <span className="font-mono text-paper/35">no receipt yet</span>
                      )}
                      {c.run_id ? (
                        <Link
                          href={`/runs/${c.run_id}`}
                          className="font-mono text-paper/55 hover:text-honey-300"
                        >
                          run: {c.run_id} →
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="mt-12 text-center text-xs text-paper/30">
          🐝 We don&apos;t judge. We&apos;re math and code. · to the shed.
        </p>
      </div>
    </div>
  );
}

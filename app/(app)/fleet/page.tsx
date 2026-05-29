// Fleet · the rig in real time. Server component: reads the sovereign DefendableRouter
// server-to-server via the BFF (routerFetch — null when unwired). Shows workers (name,
// status, last heartbeat, GPU SKUs), job counts (queued/running/completed), compute nodes
// (available/busy) and active leases. When the router address isn't configured we show an
// honest "not wired" state — never fabricated telemetry. No blackbox, no trust-me-bro.
import { routerFetch } from "@/lib/cloud";
import { Badge, Callout, Card, EmptyState } from "@/components/ui";
import type { FleetSummary, FleetWorker } from "@/lib/types";

export const runtime = "edge";
export const dynamic = "force-dynamic"; // live ops view, never cached

function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US");
}

// Relative "x ago" for heartbeats, with the absolute timestamp on hover.
function relTime(iso: string): { rel: string; abs: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { rel: iso, abs: iso };
  const abs = d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const secs = Math.round((Date.now() - d.getTime()) / 1000);
  if (secs < 0) return { rel: "just now", abs };
  if (secs < 60) return { rel: `${secs}s ago`, abs };
  const mins = Math.round(secs / 60);
  if (mins < 60) return { rel: `${mins}m ago`, abs };
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return { rel: `${hrs}h ago`, abs };
  return { rel: `${Math.round(hrs / 24)}d ago`, abs };
}

// One mono headline metric.
function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "warn" | "bad";
}) {
  const valueTone =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "bad"
          ? "text-red-300"
          : "text-paper";
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
      <div className="text-xs font-medium uppercase tracking-widest text-paper/45">{label}</div>
      <div className={`mt-2 font-mono text-3xl font-bold tracking-tight ${valueTone}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-paper/45">{sub}</div>}
    </div>
  );
}

export default async function FleetPage() {
  const [summary, workers] = await Promise.all([
    routerFetch<FleetSummary>("/admin/summary"),
    routerFetch<FleetWorker[]>("/admin/workers"),
  ]);

  const wired = summary !== null || workers !== null;
  const rigs = workers ?? [];

  return (
    <div className="min-h-screen brand-grid">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-honey-300/80">
              Sovereign compute · DefendableRouter
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-paper">Fleet</h1>
            <p className="mt-1 max-w-2xl text-sm text-paper/55">
              The rig in real time — workers, jobs and compute nodes read live from the router,
              server-to-server. Heartbeats and lease counts as the router reports them. Nothing here
              is fabricated; when telemetry is missing we say so.
            </p>
          </div>
        </div>

        {/* not-wired state — the doctrine surface */}
        {!wired && (
          <div className="mt-8">
            <Callout title="Router not wired">
              The DefendableRouter address isn&apos;t configured for this deployment, so fleet
              telemetry is unavailable. We show nothing rather than fabricate it. Set{" "}
              <code className="font-mono text-honey-300/80">DEFENDABLE_ROUTER_API_BASE</code> (and{" "}
              <code className="font-mono text-honey-300/80">DEFENDABLE_ROUTER_TOKEN</code>) on this
              CF Pages deployment to light the fleet up.
            </Callout>
          </div>
        )}

        {/* summary metrics */}
        {summary && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Workers online"
                value={fmt(summary.workers_online)}
                sub={`${fmt(summary.workers_busy)} busy · ${fmt(summary.workers_offline)} offline`}
                tone="ok"
              />
              <Stat
                label="Stale workers"
                value={fmt(summary.stale_workers)}
                sub="missed heartbeat window"
                tone={summary.stale_workers > 0 ? "warn" : undefined}
              />
              <Stat
                label="Compute nodes"
                value={`${fmt(summary.compute_nodes_available)} / ${fmt(
                  summary.compute_nodes_available + summary.compute_nodes_busy,
                )}`}
                sub="free / total"
              />
              <Stat
                label="Active leases"
                value={fmt(summary.active_leases)}
                sub="nodes leased right now"
              />
            </div>

            {/* jobs row */}
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Stat label="Jobs queued" value={fmt(summary.queued_jobs)} sub="waiting for a node" />
              <Stat
                label="Jobs running"
                value={fmt(summary.running_jobs)}
                sub="executing now"
                tone={summary.running_jobs > 0 ? "ok" : undefined}
              />
              <Stat
                label="Jobs completed"
                value={fmt(summary.completed_jobs)}
                sub="lifetime, this router"
                tone="ok"
              />
            </div>

            {/* operating context — members, datasets, the economics the router reports */}
            <div className="mt-6">
              <Card
                title="Fleet context"
                subtitle="What the router is serving and the economics it reports"
              >
                <div className="grid gap-y-4 gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
                  <ContextStat label="Active members" value={fmt(summary.active_members_count)} />
                  <ContextStat label="Datasets" value={fmt(summary.total_datasets_count)} />
                  <ContextStat
                    label="Est. job revenue"
                    value={`$${fmt(summary.estimated_revenue_from_jobs)}`}
                    sub="from completed jobs"
                  />
                  <ContextStat
                    label="Annual membership"
                    value={`$${fmt(summary.annual_membership_revenue)}`}
                    sub="recurring"
                  />
                </div>
              </Card>
            </div>
          </>
        )}

        {/* workers table */}
        {wired && (
          <div className="mt-6">
            <Card
              title="Workers"
              subtitle="Each rig the router knows about — status and last heartbeat as reported"
              actions={
                <span className="font-mono text-xs text-paper/40">
                  {rigs.length.toLocaleString("en-US")} {rigs.length === 1 ? "rig" : "rigs"}
                </span>
              }
            >
              {rigs.length === 0 ? (
                <EmptyState title="No workers registered">
                  The router responded but reports no workers. When a rig comes online and posts a
                  heartbeat, it lands here — name, status, GPU SKUs and all. Nothing to fabricate.
                </EmptyState>
              ) : (
                <div className="-mx-5 -my-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/8 text-xs uppercase tracking-widest text-paper/40">
                        <th className="px-5 py-3 font-medium">Worker</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 font-medium">GPU SKUs</th>
                        <th className="px-5 py-3 text-right font-medium">Last heartbeat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rigs.map((w) => {
                        const hb = relTime(w.last_heartbeat_at);
                        const skus = w.gpu_skus ?? [];
                        return (
                          <tr
                            key={w.id || w.node_id}
                            className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]"
                          >
                            <td className="px-5 py-3">
                              <div className="font-medium text-paper">{w.name || w.node_id}</div>
                              <div className="mt-0.5 font-mono text-xs text-paper/35">
                                {w.hostname || w.node_id}
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <Badge value={w.status} />
                            </td>
                            <td className="px-5 py-3">
                              {skus.length ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {skus.map((sku, i) => (
                                    <span
                                      key={`${w.id}-${i}`}
                                      className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-xs text-paper/70"
                                    >
                                      {sku}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="font-mono text-xs text-paper/35">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <span
                                className="font-mono text-xs text-paper/60"
                                title={hb.abs}
                              >
                                {hb.rel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        <p className="mt-12 text-center text-xs text-paper/30">
          🐝 Sovereign compute · the rig, visible · to the shed.
        </p>
      </div>
    </div>
  );
}

// A labeled context figure inside the fleet-context card.
function ContextStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-widest text-paper/45">{label}</div>
      <div className="mt-1 font-mono text-xl font-bold text-paper">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-paper/40">{sub}</div>}
    </div>
  );
}

// Overview · The Office front door (Tier-3 command center, server component).
// Pulls cloud usage + recent receipts directly via the BFF, derives the verdict mix +
// flag rate honestly, reads the router fleet summary (honest "not wired" if null), and
// mounts the live ledger-integrity badge. Every card links to its page.
import Link from "next/link";
import { cloudSafe, routerFetch } from "@/lib/cloud";
import { deriveOverview } from "@/lib/overview";
import type { FleetSummary, OrgUsage, ReceiptRollup } from "@/lib/types";
import { Badge, Card, Callout, EmptyState } from "@/components/ui";
import LedgerBadge from "@/components/LedgerBadge";

export const dynamic = "force-dynamic"; // per-member, never cached

function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US");
}

// One headline metric, mono, linking to its surface.
function Stat({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-white/8 bg-white/[0.02] p-5 transition-colors hover:border-honey-400/30"
    >
      <div className="text-xs font-medium uppercase tracking-widest text-paper/45">{label}</div>
      <div className="mt-2 font-mono text-3xl font-bold tracking-tight text-paper group-hover:text-honey-200">
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-paper/50">{sub}</div>}
    </Link>
  );
}

export default async function Overview() {
  const [usage, receipts, fleet] = await Promise.all([
    cloudSafe<Partial<OrgUsage>>("/org/usage", {}),
    cloudSafe<{ rollups: ReceiptRollup[] }>("/receipts/recent?limit=50", { rollups: [] }),
    routerFetch<FleetSummary>("/admin/summary"),
  ]);

  const rollups = receipts.rollups ?? [];
  const mix = deriveOverview(rollups);
  const earnedLanes = usage.earned_lanes ?? [];

  return (
    <div className="min-h-screen brand-grid">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* header + live ledger integrity */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-honey-300/80">
              DefendableDash · The Office
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-paper">Command center</h1>
            <p className="mt-1 max-w-2xl text-sm text-paper/55">
              The whole ecosystem in one pane — no blackbox, no trust-me-bro. Every number below is
              read live from your org; every receipt is hash-chain verified.
            </p>
          </div>
          <LedgerBadge />
        </div>

        {/* top-line receipt counts */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Receipts · lifetime"
            value={fmt(usage.receipts_lifetime)}
            sub={usage.org_seq !== undefined ? `org seq #${fmt(usage.org_seq)}` : "the org chain"}
            href="/ledger"
          />
          <Stat
            label="Receipts · this month"
            value={fmt(usage.receipts_this_month)}
            sub="minted this period"
            href="/ledger"
          />
          <Stat
            label="Flag rate"
            value={mix.eval_total > 0 ? `${Math.round(mix.flag_rate * 100)}%` : "—"}
            sub={
              mix.eval_total > 0
                ? `${fmt(mix.flagged)} flagged of ${fmt(mix.eval_total)} evals`
                : "no graded evals yet"
            }
            href="/runs"
          />
          <Stat
            label="Earned lanes"
            value={fmt(earnedLanes.length)}
            sub={earnedLanes.length ? earnedLanes.join(" · ") : "none earned yet"}
            href="/runs"
          />
        </div>

        {/* verdict mix — derived from recent eval receipts */}
        <div className="mt-6">
          <Card
            title="Verdict mix"
            subtitle="Tier of the most recent graded evals — honey pass · jelly risk · propolis fail"
            actions={<Link href="/runs" className="text-xs text-honey-300/80 hover:text-honey-200">Show the Math →</Link>}
          >
            {mix.eval_total > 0 ? (
              <VerdictBar mix={mix} />
            ) : (
              <EmptyState title="No graded evals yet">
                Run an eval in DefendableCloud and the tier mix appears here — re-derived from the
                receipt summaries, not asserted.
              </EmptyState>
            )}
          </Card>
        </div>

        {/* fleet strip — router may be unwired; say so honestly */}
        <div className="mt-6">
          <Card
            title="Fleet"
            subtitle="Sovereign compute via DefendableRouter (server-to-server)"
            actions={<Link href="/fleet" className="text-xs text-honey-300/80 hover:text-honey-200">Open Fleet →</Link>}
          >
            {fleet ? (
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <FleetStat label="Workers online" value={fmt(fleet.workers_online)} tone="ok" />
                <FleetStat label="Workers busy" value={fmt(fleet.workers_busy)} />
                <FleetStat label="Jobs queued" value={fmt(fleet.queued_jobs)} />
                <FleetStat label="Jobs running" value={fmt(fleet.running_jobs)} />
                <FleetStat label="Jobs completed" value={fmt(fleet.completed_jobs)} tone="ok" />
                <FleetStat
                  label="Compute nodes"
                  value={`${fmt(fleet.compute_nodes_available)} / ${fmt(
                    fleet.compute_nodes_available + fleet.compute_nodes_busy,
                  )}`}
                  sub="free / total"
                />
              </div>
            ) : (
              <Callout title="Router not wired">
                The DefendableRouter address isn&apos;t configured for this deployment, so fleet
                telemetry is unavailable. We show nothing rather than fabricate it. Set{" "}
                <code className="font-mono text-honey-300/80">DEFENDABLE_ROUTER_API_BASE</code> to
                light this strip up.
              </Callout>
            )}
          </Card>
        </div>

        {/* navigation footer */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/runs", title: "Runs · Show the Math", desc: "Every check re-derived. Verify 1+1=2 yourself." },
            { href: "/ledger", title: "Ledger · Verify", desc: "The hash chain, recomputed live. Tamper-evident." },
            { href: "/fleet", title: "Fleet", desc: "Workers, jobs, compute — the rig in real time." },
            { href: "/cooks", title: "Cooks", desc: "Eval before/after, lift, the cook receipts." },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-xl border border-white/8 bg-white/[0.02] p-5 transition-colors hover:border-honey-400/30"
            >
              <div className="font-semibold text-paper">{c.title}</div>
              <div className="mt-1 text-sm text-paper/50">{c.desc}</div>
            </Link>
          ))}
        </div>

        <p className="mt-12 text-center text-xs text-paper/30">
          🐝 Defendable ecosystem · math and code, visible · to the shed.
        </p>
      </div>
    </div>
  );
}

// Stacked proportional bar of the verdict tiers + a legend with counts.
function VerdictBar({ mix }: { mix: ReturnType<typeof deriveOverview> }) {
  const total = mix.eval_total || 1;
  const segs = [
    { key: "honey", label: "honey · pass", count: mix.honey, bar: "bg-emerald-400/70" },
    { key: "jelly", label: "jelly · risk", count: mix.jelly, bar: "bg-amber-400/70" },
    { key: "propolis", label: "propolis · fail", count: mix.propolis, bar: "bg-red-400/70" },
  ] as const;

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full border border-white/10 bg-white/5">
        {segs.map((s) =>
          s.count > 0 ? (
            <div
              key={s.key}
              className={s.bar}
              style={{ width: `${(s.count / total) * 100}%` }}
              title={`${s.label}: ${s.count}`}
            />
          ) : null,
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        {segs.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <Badge value={s.key} />
            <span className="font-mono text-sm text-paper/80">{s.count.toLocaleString("en-US")}</span>
            <span className="text-xs text-paper/40">{Math.round((s.count / total) * 100)}%</span>
          </div>
        ))}
        <span className="ml-auto font-mono text-xs text-paper/40">
          {mix.eval_total.toLocaleString("en-US")} graded evals
        </span>
      </div>
    </div>
  );
}

function FleetStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ok";
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-widest text-paper/45">{label}</div>
      <div
        className={`mt-1 font-mono text-xl font-bold ${tone === "ok" ? "text-emerald-300" : "text-paper"}`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-paper/40">{sub}</div>}
    </div>
  );
}

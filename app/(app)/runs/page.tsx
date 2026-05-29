// Runs list — every Defendable Run in the org, newest first. Server component:
// reads the cloud as the signed-in member (session cookie → Bearer). Honest empty
// state when there are no runs; never fabricated rows.
import Link from "next/link";
import { cloudSafe } from "@/lib/cloud";
import { Badge, EmptyState } from "@/components/ui";
import type { Run } from "@/lib/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function RunsPage() {
  const { runs } = await cloudSafe<{ runs: Run[] }>("/runs?limit=100", { runs: [] });

  return (
    <div className="min-h-screen brand-grid">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="text-xs font-semibold uppercase tracking-widest text-honey-300/80">
          Defendable Runs
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-paper">Runs</h1>
        <p className="mt-1 max-w-2xl text-sm text-paper/50">
          Every agent submission tested against a declared rulebook. Open one to see the verdict and
          the math re-derived — no judge model, no opinion, just checks.
        </p>

        <div className="mt-8">
          {runs.length === 0 ? (
            <EmptyState title="No runs yet">
              When agent work is submitted and graded, runs land here — each with its referee checks
              and a hash-chained receipt. Nothing to fabricate.
            </EmptyState>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/8 bg-white/[0.02]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-xs uppercase tracking-widest text-paper/40">
                    <th className="px-5 py-3 font-medium">Title</th>
                    <th className="px-5 py-3 font-medium">Lane</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Verdict</th>
                    <th className="px-5 py-3 text-right font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/runs/${r.id}`}
                          className="font-medium text-paper hover:text-honey-300"
                        >
                          {r.title || r.id}
                        </Link>
                        <div className="mt-0.5 font-mono text-xs text-paper/35">{r.id}</div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge value={r.lane} />
                      </td>
                      <td className="px-5 py-3">
                        <Badge value={r.status} />
                      </td>
                      <td className="px-5 py-3">
                        {r.verdict ? (
                          <Badge value={r.verdict} />
                        ) : (
                          <span className="font-mono text-xs text-paper/35">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-paper/50">
                        {fmtDate(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

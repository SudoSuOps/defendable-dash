// Ledger · the hash chain you re-check, not trust. Server component: reads the
// merged ledger via the BFF (cloud org chain + sovereign router chain). Renders
// the chains as two tables (org_seq/seq · receipt_id · parent_hash · receipt_sha256
// · created_at) under a prominent LIVE VERIFY panel that recomputes both on demand.
// Honest empty / "not wired" states throughout — never fabricated rows.
import { cloudSafe, routerFetch } from "@/lib/cloud";
import { Card, EmptyState, Callout } from "@/components/ui";
import LedgerVerifyPanel from "@/components/LedgerVerifyPanel";
import type { Ledger, RouterReceipts } from "@/lib/types";

export const runtime = "edge";
export const dynamic = "force-dynamic"; // per-member, never cached

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

// Truncate a hash for the table while keeping it copyable in full via title.
function trunc(hash: string | null | undefined): string {
  if (!hash) return "—";
  if (hash.length <= 18) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

function Hash({ value }: { value: string | null | undefined }) {
  return (
    <span title={value || undefined} className="font-mono text-xs text-paper/55">
      {trunc(value)}
    </span>
  );
}

export default async function LedgerPage() {
  const [cloud, router] = await Promise.all([
    cloudSafe<Ledger>("/ledger", { entries: [] }),
    routerFetch<RouterReceipts>("/receipts"),
  ]);

  const cloudEntries = cloud.entries ?? [];
  const routerReceipts = router?.receipts ?? [];

  return (
    <div className="min-h-screen brand-grid">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="text-xs font-semibold uppercase tracking-widest text-honey-300/80">
          Books and records
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-paper">Ledger</h1>
        <p className="mt-1 max-w-2xl text-sm text-paper/55">
          Every receipt is hash-chained to its parent. This is the chain — and the button that
          recomputes it live. You don&apos;t trust the rows; you re-check them. No blackbox, no
          trust-me-bro.
        </p>

        {/* prominent live verify panel */}
        <div className="mt-8">
          <LedgerVerifyPanel />
        </div>

        {/* cloud org chain */}
        <div className="mt-8">
          <Card
            title="Cloud · org chain"
            subtitle={`${cloudEntries.length.toLocaleString("en-US")} receipt${
              cloudEntries.length === 1 ? "" : "s"
            } · each links org_seq → parent_hash → receipt_sha256`}
          >
            {cloudEntries.length === 0 ? (
              <EmptyState title="No receipts on the org chain yet">
                When your org mints its first Defendable Run receipt, it lands here as the genesis
                link of the hash chain. Nothing to fabricate.
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/8 text-xs uppercase tracking-widest text-paper/40">
                      <th className="py-3 pr-4 font-medium">Seq</th>
                      <th className="py-3 pr-4 font-medium">Receipt ID</th>
                      <th className="py-3 pr-4 font-medium">Parent hash</th>
                      <th className="py-3 pr-4 font-medium">Receipt SHA-256</th>
                      <th className="py-3 text-right font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cloudEntries.map((e) => (
                      <tr
                        key={e.receipt_id}
                        className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]"
                      >
                        <td className="py-3 pr-4 font-mono text-xs text-honey-200">
                          #{e.org_seq}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-paper/75">
                          {e.receipt_id}
                        </td>
                        <td className="py-3 pr-4">
                          <Hash value={e.parent_hash} />
                        </td>
                        <td className="py-3 pr-4">
                          <Hash value={e.receipt_sha256} />
                        </td>
                        <td className="py-3 text-right font-mono text-xs text-paper/50">
                          {fmtDate(e.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* router sovereign chain */}
        <div className="mt-6">
          <Card
            title="Router · sovereign chain"
            subtitle={
              router
                ? `${(router.count ?? routerReceipts.length).toLocaleString("en-US")} receipt${
                    (router.count ?? routerReceipts.length) === 1 ? "" : "s"
                  } · seq → parent_hash → checksum_sha256`
                : "server-to-server via DefendableRouter"
            }
          >
            {!router ? (
              <Callout title="Router not wired">
                The DefendableRouter address isn&apos;t configured for this deployment, so the
                sovereign receipt chain is unavailable. We show nothing rather than fabricate it.
                Set{" "}
                <code className="font-mono text-honey-300/80">DEFENDABLE_ROUTER_API_BASE</code> to
                light this chain up.
              </Callout>
            ) : routerReceipts.length === 0 ? (
              <EmptyState title="Router chain is empty">
                The router is wired but hasn&apos;t minted any receipts yet. The chain starts the
                moment the first job settles.
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/8 text-xs uppercase tracking-widest text-paper/40">
                      <th className="py-3 pr-4 font-medium">Seq</th>
                      <th className="py-3 pr-4 font-medium">Receipt ID</th>
                      <th className="py-3 pr-4 font-medium">Type</th>
                      <th className="py-3 pr-4 font-medium">Parent hash</th>
                      <th className="py-3 pr-4 font-medium">Checksum SHA-256</th>
                      <th className="py-3 text-right font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routerReceipts.map((r) => (
                      <tr
                        key={r.receipt_id}
                        className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]"
                      >
                        <td className="py-3 pr-4 font-mono text-xs text-honey-200">#{r.seq}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-paper/75">
                          {r.receipt_id}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-paper/55">
                          {r.receipt_type}
                        </td>
                        <td className="py-3 pr-4">
                          <Hash value={r.parent_hash} />
                        </td>
                        <td className="py-3 pr-4">
                          <Hash value={r.checksum_sha256} />
                        </td>
                        <td className="py-3 text-right font-mono text-xs text-paper/50">
                          {fmtDate(r.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <p className="mt-12 text-center text-xs text-paper/30">
          🐝 Books and records you re-check, not trust · to the shed.
        </p>
      </div>
    </div>
  );
}

// Prominent LIVE VERIFY panel — the books-and-records doctrine surface.
// Recomputes BOTH hash chains on demand via /api/ledger/verify and renders an
// honest verdict: ✓ chain intact (recomputed N, 0 errors) or ✗ with the offending
// seq from the error string. Re-check button so the user proves it themselves —
// no blackbox, no trust-me-bro. Router is shown as "not wired" when absent.
"use client";

import { useCallback, useEffect, useState } from "react";
import type { LedgerVerify, LedgerVerifyCombined } from "@/lib/types";
import { Button } from "@/components/ui";

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: LedgerVerifyCombined; at: Date }
  | { kind: "error" };

function ChainVerdict({
  label,
  result,
}: {
  label: string;
  result: LedgerVerify;
}) {
  const { ok, receipts_checked, errors } = result;
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        ok
          ? "border-emerald-400/30 bg-emerald-400/[0.06]"
          : "border-red-400/40 bg-red-400/[0.06]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-paper/55">
          {label}
        </span>
        <span
          className={`font-mono text-sm font-bold ${ok ? "text-emerald-300" : "text-red-300"}`}
        >
          {ok ? "✓ chain intact" : "✗ TAMPERED"}
        </span>
      </div>
      <div className="mt-2 font-mono text-xs text-paper/60">
        {ok ? (
          <>
            recomputed {receipts_checked.toLocaleString("en-US")} receipt
            {receipts_checked === 1 ? "" : "s"} · 0 errors · every receipt links to its parent
          </>
        ) : (
          <>
            recomputed {receipts_checked.toLocaleString("en-US")} · {errors.length} error
            {errors.length === 1 ? "" : "s"}
          </>
        )}
      </div>
      {!ok && errors.length > 0 && (
        <ul className="mt-2 space-y-1">
          {errors.map((e, i) => (
            <li key={i} className="font-mono text-xs text-red-300/90">
              ↳ {e}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function LedgerVerifyPanel() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const run = useCallback(() => {
    setState({ kind: "loading" });
    let cancelled = false;
    fetch("/api/ledger/verify", { cache: "no-store" })
      .then((r) =>
        r.ok ? (r.json() as Promise<LedgerVerifyCombined>) : Promise.reject(new Error(String(r.status))),
      )
      .then((data) => !cancelled && setState({ kind: "ok", data, at: new Date() }))
      .catch(() => !cancelled && setState({ kind: "error" }));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => run(), [run]);

  const combinedOk = state.kind === "ok" && state.data.ok;

  return (
    <div
      className={`rounded-xl border bg-white/[0.02] ${
        state.kind === "ok"
          ? combinedOk
            ? "border-emerald-400/30"
            : "border-red-400/40"
          : "border-white/8"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-honey-300/80">
            <span aria-hidden="true">›</span> Live verify
          </div>
          <div className="mt-0.5 text-xs text-paper/50">
            Hash chains recomputed on demand. Don&apos;t trust the table — re-check it.
          </div>
        </div>
        <Button variant="ghost" onClick={run} disabled={state.kind === "loading"}>
          {state.kind === "loading" ? "Recomputing…" : "Re-check chains"}
        </Button>
      </div>

      <div className="px-5 py-4">
        {state.kind === "loading" && (
          <div className="flex items-center gap-2 text-sm text-paper/55">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-honey-300/30 border-t-honey-300" />
            recomputing hash chains…
          </div>
        )}

        {state.kind === "error" && (
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-paper/55">
            Verification endpoint unavailable. We show nothing rather than fabricate a verdict.
          </div>
        )}

        {state.kind === "ok" && (
          <div className="space-y-4">
            {/* combined headline verdict */}
            <div
              className={`flex flex-wrap items-baseline justify-between gap-2 ${
                combinedOk ? "text-emerald-300" : "text-red-300"
              }`}
            >
              <span className="font-mono text-lg font-bold">
                {combinedOk ? "✓ Books and records intact" : "✗ Chain integrity FAILED"}
              </span>
              <span className="font-mono text-xs text-paper/40">
                checked {state.at.toLocaleTimeString("en-US")}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ChainVerdict label="Cloud org chain" result={state.data.cloud} />
              {state.data.router_wired && state.data.router ? (
                <ChainVerdict label="Router sovereign chain" result={state.data.router} />
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.01] px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-widest text-paper/45">
                    Router sovereign chain
                  </div>
                  <div className="mt-2 font-mono text-xs text-paper/45">
                    not wired — no router chain to verify. Honest absence, not a pass.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Live ledger-integrity badge. Fetches /api/ledger/verify on mount and recomputes
// the verdict on the client so the user sees a fresh, honest result every load.
// ✓ verified (N receipts) when the hash chain recomputes · ✗ TAMPERED when it doesn't.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LedgerVerify } from "@/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: LedgerVerify }
  | { kind: "error" };

export default function LedgerBadge() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    fetch("/api/ledger/verify", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<LedgerVerify>) : Promise.reject(new Error(String(r.status)))))
      .then((data) => live && setState({ kind: "ok", data }))
      .catch(() => live && setState({ kind: "error" }));
    return () => {
      live = false;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-paper/50">
        <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-honey-300/30 border-t-honey-300" />
        verifying chain…
      </span>
    );
  }

  if (state.kind === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-paper/55">
        ledger check unavailable
      </span>
    );
  }

  const { ok, receipts_checked, errors } = state.data;
  const tone = ok
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
    : "border-red-400/30 bg-red-400/10 text-red-300";

  return (
    <Link
      href="/ledger"
      title={ok ? "Hash chain recomputed live — every receipt links to its parent." : errors.join(" · ")}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-xs ${tone}`}
    >
      {ok ? (
        <>✓ chain verified · {receipts_checked.toLocaleString("en-US")} receipts</>
      ) : (
        <>✗ TAMPERED · {errors.length} error{errors.length === 1 ? "" : "s"}</>
      )}
    </Link>
  );
}

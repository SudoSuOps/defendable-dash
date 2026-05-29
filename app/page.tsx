import Link from "next/link";

// Tier-3 command center stub — wired to live /api/overview in the next phase.
export default function Home() {
  return (
    <main className="min-h-screen brand-grid">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-xs font-semibold uppercase tracking-widest text-honey-300/80">
          DefendableDash · The Office
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-paper">
          Visibility into everything.
        </h1>
        <p className="mt-2 max-w-2xl text-paper/55">
          One login. The whole ecosystem in one pane — every run with the math re-derived (1+1=2),
          every receipt hash-chain verified, every cook, the GPU fleet. We don&apos;t judge; we&apos;re
          math and code — and now you can <span className="text-paper/80">see it</span>. The AI
          blackbox trust-me-bro days are over.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </main>
  );
}

// Run detail — the Defendable Run trace + the SHOW-THE-MATH hero.
// Server component: merges /runs/{id} + /runs/{id}/checks + /runs/{id}/verdict
// via the local edge BFF route (same-origin, forwards the session cookie).
//
// The referee is a RULEBOOK, not a judge model. For category=math checks we
// re-derive the calculation from the agent's own formula + inputs and show:
//   rule    -> the declared formula
//   compute -> substituted inputs = X   (what we recomputed)
//   stated  -> Y                         (what the agent claimed)
//   ✓ matches / ✗ off by Z%
// Ported from defendable-cloud-v2 ShowMath.tsx — adapted to parse live Check.detail.
import { headers } from "next/headers";
import Link from "next/link";
import { Badge, Card, Callout, EmptyState } from "@/components/ui";
import type { Check, RunDetail, Verdict, VerdictOutcome } from "@/lib/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// ── A math check may arrive structured (backend inlined calc fields) OR as free
// text in `detail`. We support both: prefer structured, else parse the detail. ──
interface MathCalc {
  formula?: string;
  inputs?: Record<string, number | string>;
  substituted?: string;
  stated?: number | string;
  recomputed?: number | string;
}
type CheckWithCalc = Check & MathCalc & { name?: string; calc?: MathCalc };

interface DerivedMath {
  name: string;
  formula: string | null;
  substituted: string | null;
  recomputed: number | string | null;
  stated: number | string | null;
  status: string;
  detail: string;
  offByPct: number | null;
}

function num(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  if (Math.abs(n) >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return String(parseFloat(n.toFixed(6)));
}

function toNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[, $%]/g, ""));
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

// Pull "recomputed = X" / "stated = Y" style figures out of free-text detail.
// Recognizes a few common phrasings the referee emits; falls back to null so we
// never invent a number (honest, not fabricated).
function parseDetail(detail: string): { recomputed: number | null; stated: number | null; substituted: string | null } {
  const text = detail || "";
  const grab = (re: RegExp): number | null => {
    const m = text.match(re);
    return m ? toNum(m[1]) : null;
  };
  const recomputed =
    grab(/recompute[d]?[^0-9.+-]*([-+]?[\d,]+\.?\d*)/i) ??
    grab(/expected[^0-9.+-]*([-+]?[\d,]+\.?\d*)/i) ??
    grab(/=\s*([-+]?[\d,]+\.?\d*)/);
  const stated =
    grab(/stated[^0-9.+-]*([-+]?[\d,]+\.?\d*)/i) ??
    grab(/claimed[^0-9.+-]*([-+]?[\d,]+\.?\d*)/i) ??
    grab(/agent[^0-9.+-]*([-+]?[\d,]+\.?\d*)/i);
  const subMatch = text.match(/compute[d]?[:\s]+(.+?)(?:=|$)/i);
  const substituted = subMatch ? subMatch[1].trim() : null;
  return { recomputed, stated, substituted };
}

function deriveMath(c: CheckWithCalc): DerivedMath {
  const calc: MathCalc = c.calc ?? {
    formula: c.formula,
    inputs: c.inputs,
    substituted: c.substituted,
    stated: c.stated,
    recomputed: c.recomputed,
  };

  // Build a substituted string from structured inputs if one wasn't provided.
  let substituted = calc.substituted ?? null;
  if (!substituted && calc.inputs && Object.keys(calc.inputs).length) {
    substituted = Object.entries(calc.inputs)
      .map(([k, v]) => `${k}=${num(typeof v === "string" ? Number(v) : v)}`)
      .join(", ");
  }

  let recomputed = calc.recomputed ?? null;
  let stated = calc.stated ?? null;

  // Fall back to parsing the free-text detail for any figure not given structurally.
  if (recomputed === null || stated === null || !substituted) {
    const p = parseDetail(c.detail);
    if (recomputed === null) recomputed = p.recomputed;
    if (stated === null) stated = p.stated;
    if (!substituted) substituted = p.substituted;
  }

  const rN = toNum(recomputed);
  const sN = toNum(stated);
  let offByPct: number | null = null;
  if (rN !== null && sN !== null && rN !== 0) {
    offByPct = Math.abs((sN - rN) / rN) * 100;
  }

  return {
    name: c.name || c.label || c.check_key,
    formula: calc.formula ?? null,
    substituted,
    recomputed,
    stated,
    status: c.status,
    detail: c.detail,
    offByPct,
  };
}

function MathRow({ m }: { m: DerivedMath }) {
  const ok = m.status === "pass";
  const tone = ok ? "border-emerald-400/25 bg-emerald-400/[0.03]" : "border-red-400/30 bg-red-400/[0.05]";
  const off =
    m.offByPct !== null && m.offByPct > 0
      ? `off by ${m.offByPct.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`
      : m.detail.includes("—")
        ? m.detail.split("—").slice(-1)[0].trim()
        : m.detail || "does not re-derive";
  return (
    <div className={`rounded-lg border ${tone} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-sm font-semibold text-paper">{m.name}</div>
        <Badge value={ok ? "pass" : "flag"} />
      </div>
      {/* the re-derivation — read it left to right and check it yourself */}
      <div className="mt-3 space-y-1.5 font-mono text-sm">
        {m.formula && (
          <div className="text-paper/45">
            <span className="text-paper/30">rule&nbsp;&nbsp;&nbsp;&nbsp;</span>
            {m.formula}
          </div>
        )}
        {(m.substituted || m.recomputed !== null) && (
          <div className="text-paper/90">
            <span className="text-paper/30">compute&nbsp;</span>
            {m.substituted && <span>{m.substituted}</span>}
            {m.recomputed !== null && <span className="text-honey-300"> = {num(m.recomputed)}</span>}
          </div>
        )}
        <div className={ok ? "text-emerald-300" : "text-red-300"}>
          <span className="text-paper/30">stated&nbsp;&nbsp;</span>
          {num(m.stated)}
          <span className="ml-2">{ok ? "✓ matches the re-derivation" : `✗ ${off}`}</span>
        </div>
        {/* When we couldn't parse figures, show the raw referee detail — honest, not hidden. */}
        {m.recomputed === null && m.stated === null && (
          <div className="text-paper/50">{m.detail}</div>
        )}
      </div>
    </div>
  );
}

function CheckRow({ c }: { c: Check }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 font-mono text-xs">
      <span className="flex items-center gap-2">
        <span className="text-paper/70">{c.label || c.check_key}</span>
        <span className="rounded border border-white/8 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-paper/35">
          {c.category}
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-paper/40">{c.detail}</span>
        <Badge value={c.status} />
      </span>
    </div>
  );
}

// The Defendable Run is an ordered pipeline. Show which stages are present —
// honestly marking the ones the backend didn't return (degrade, don't fabricate).
function TraceStages({ run }: { run: RunDetail }) {
  const stages: { key: keyof RunDetail; label: string }[] = [
    { key: "flight_sheet", label: "Flight Sheet" },
    { key: "submission", label: "Submission" },
    { key: "evidence", label: "Evidence" },
    { key: "checks", label: "Checks" },
    { key: "verdict", label: "Verdict" },
    { key: "approval", label: "Approval" },
    { key: "receipt", label: "Receipt" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {stages.map((s) => {
        const v = run[s.key];
        const present = Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined;
        return (
          <span
            key={String(s.key)}
            className={`rounded-md border px-2.5 py-1 font-mono text-xs ${
              present
                ? "border-honey-400/30 bg-honey-300/10 text-honey-200"
                : "border-white/10 bg-white/5 text-paper/35"
            }`}
            title={present ? "present" : "not present on this run"}
          >
            {s.label}
            {!present && " ·"}
          </span>
        );
      })}
    </div>
  );
}

function isVerdict(v: unknown): v is Verdict {
  return typeof v === "object" && v !== null && "score_100" in (v as Record<string, unknown>);
}

async function fetchRun(id: string): Promise<RunDetail | null> {
  // Same-origin call to the merge BFF; forward the incoming cookies so the edge
  // route can read the session and call the cloud as the member.
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  const cookie = h.get("cookie") || "";
  const base = host ? `${proto}://${host}` : "";
  try {
    const res = await fetch(`${base}/api/runs/${encodeURIComponent(id)}`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as RunDetail;
  } catch {
    return null;
  }
}

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await fetchRun(id);

  if (!run) {
    return (
      <div className="min-h-screen brand-grid">
        <div className="mx-auto max-w-3xl px-5 py-12">
          <Link href="/runs" className="text-sm text-paper/50 hover:text-honey-300">
            ← Runs
          </Link>
          <div className="mt-6">
            <EmptyState title="Run not found">
              We couldn&apos;t load this run for your org. It may not exist, or the cloud is
              unreachable. We won&apos;t fabricate a trace.
            </EmptyState>
          </div>
        </div>
      </div>
    );
  }

  const checks: CheckWithCalc[] = (run.checks ?? []) as CheckWithCalc[];
  const mathChecks = checks.filter((c) => c.category === "math").map(deriveMath);
  const otherChecks = checks.filter((c) => c.category !== "math");
  const passes = mathChecks.filter((m) => m.status === "pass").length;
  const flags = mathChecks.filter((m) => m.status !== "pass").length;
  const skipped = otherChecks.filter((c) => c.status === "skip").length;

  const verdict = isVerdict(run.verdict) ? run.verdict : null;
  const verdictOutcome: VerdictOutcome | null = verdict
    ? verdict.outcome
    : typeof run.verdict === "string"
      ? (run.verdict as VerdictOutcome)
      : null;

  return (
    <div className="min-h-screen brand-grid">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <Link href="/runs" className="text-sm text-paper/50 hover:text-honey-300">
          ← Runs
        </Link>

        <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-honey-300/80">
          Defendable Run · Referee · Show the Math
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-paper">{run.title || run.id}</h1>
        <p className="mt-1 text-sm text-paper/50">
          The referee is a <span className="text-paper/80">rulebook, not a judge model</span>. Every
          number below is re-derived from the agent&apos;s own formula and inputs. Read it left to
          right — verify 1+1=2 yourself.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Badge value={run.lane} />
          <Badge value={run.status} />
          {verdict && <Badge value={verdict.severity} />}
          {verdictOutcome && <Badge value={verdictOutcome} />}
          {verdict && (
            <span className="font-mono text-sm text-paper/60">{verdict.score_100}/100 weighted</span>
          )}
          {mathChecks.length > 0 && (
            <span className="text-sm text-paper/50">
              · {passes} re-derivation{passes === 1 ? "" : "s"} verified ·{" "}
              <span className={flags ? "text-red-300" : "text-paper/40"}>{flags} flag{flags === 1 ? "" : "s"}</span>
            </span>
          )}
        </div>

        {verdict && !verdict.client_ready && (
          <div className="mt-5">
            <Callout title={flags > 0 ? "Why this run is flagged" : "Not client-ready"}>
              {verdict.recommended_action ||
                verdict.summary ||
                "A check did not satisfy the rulebook. See the flagged rows below."}
            </Callout>
          </div>
        )}

        {/* The Defendable Run trace — which pipeline stages are present. */}
        <div className="mt-7">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-paper/40">
            Run trace
          </div>
          <TraceStages run={run} />
        </div>

        {/* SHOW-THE-MATH hero */}
        <div className="mt-8">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-paper/40">
            {mathChecks.length > 0
              ? `The math · ${mathChecks.length} calculation${mathChecks.length === 1 ? "" : "s"} re-derived`
              : "The math"}
          </div>
          {mathChecks.length === 0 ? (
            <EmptyState title="No math checks on this run">
              This run&apos;s rulebook has no machine-derivable calculations. When it does, each one
              is recomputed here from the agent&apos;s own inputs.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {mathChecks.map((m) => (
                <MathRow key={m.name} m={m} />
              ))}
            </div>
          )}
        </div>

        {/* The rest of the rulebook — schema/structure/evidence/policy checks. */}
        <div className="mt-8">
          <Card
            title="The rest of the rulebook"
            subtitle={
              otherChecks.length > 0
                ? `${otherChecks.length} checks · ${skipped} not machine-evaluable in v1 (shown honestly, not hidden)`
                : "No additional checks recorded"
            }
          >
            {otherChecks.length === 0 ? (
              <p className="text-sm text-paper/45">Nothing else to show — and we won&apos;t pad it.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {otherChecks.map((c) => (
                  <CheckRow key={c.check_key} c={c} />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Verdict summary + receipt pointer. */}
        {verdict && (
          <div className="mt-8">
            <Card title="Verdict" subtitle="Tier-weighted · honey=pass · jelly=risk · propolis=fail">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <Badge value={verdict.severity} />
                  <Badge value={verdict.outcome} />
                  <span className="font-mono text-paper/70">{verdict.score_100}/100</span>
                  <Badge value={verdict.client_ready ? "approved" : "open"} />
                </div>
                {verdict.summary && <p className="text-paper/70">{verdict.summary}</p>}
                {verdict.recommended_action && (
                  <p className="text-paper/50">
                    <span className="text-paper/35">Recommended action: </span>
                    {verdict.recommended_action}
                  </p>
                )}
                <div className="font-mono text-xs text-paper/40">
                  {verdict.checks_passed} passed · {verdict.checks_failed} failed
                </div>
              </div>
            </Card>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-paper/30">
          Math and code, visible. No trust required — re-run the formulas yourself. 🐝 to the shed.
        </p>
      </div>
    </div>
  );
}

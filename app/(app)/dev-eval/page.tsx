"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Callout, EmptyState } from "@/components/ui";

export const runtime = "edge";

type InferResult = { model: string; output: string; ms: number; eval_count?: number };
type Verdict = {
  receipt_id?: string; seq?: number; created_at?: string;
  metadata?: { model?: string; verdict?: string; score?: number; notes?: string; winner?: string; base_model?: string };
};

const DEFAULT_SYSTEM =
  "You are a precise legal reasoning engine trained in U.S. consumer protection law.\n\nYou MUST:\n- follow IRAC structure: [ISSUE], [RULE], [ANALYSIS], [CONCLUSION]\n- avoid hallucinating statutes or cases\n- use cautious, defensible reasoning\n- be formal and structured";

function OutputPanel({ r, label }: { r: InferResult; label?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-mono text-honey-300">{label ? `${label} · ` : ""}{r.model}</span>
        <span className="text-paper/40">{r.ms}ms{r.eval_count ? ` · ${r.eval_count} tok` : ""}</span>
      </div>
      <pre className="max-h-[28rem] overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-paper/85">{r.output || "(empty)"}</pre>
    </div>
  );
}

export default function DevEvalPage() {
  const [models, setModels] = useState<string[]>([]);
  const [modelsNote, setModelsNote] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [baseModel, setBaseModel] = useState("");
  const [system, setSystem] = useState(DEFAULT_SYSTEM);
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<InferResult[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [verdict, setVerdict] = useState<"pass" | "flag" | "">("");
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");
  const [winner, setWinner] = useState<"tuned" | "base" | "tie" | "">("");
  const [saved, setSaved] = useState<string | null>(null);
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);

  const loadVerdicts = async () => {
    try {
      const d = await (await fetch("/api/dev-eval/verdicts", { cache: "no-store" })).json();
      setVerdicts(d.verdicts || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    (async () => {
      try {
        const d = await (await fetch("/api/dev-eval/models", { cache: "no-store" })).json();
        setModels(d.models || []);
        setModelsNote(d.note || null);
        if (d.models?.length) setModel(d.models[0]);
      } catch { setModelsNote("could not reach router"); }
    })();
    loadVerdicts();
  }, []);

  const run = async () => {
    if (!model || !prompt.trim()) return;
    setRunning(true); setErr(null); setResults(null); setSaved(null); setVerdict(""); setWinner("");
    try {
      const res = await fetch("/api/dev-eval/infer", {
        method: "POST",
        body: JSON.stringify({ model, prompt, system: system || undefined, base_model: baseModel || undefined }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || "inference failed"); }
      else setResults(d.results || []);
    } catch (e) { setErr(String(e)); }
    setRunning(false);
  };

  const submitVerdict = async () => {
    if (!results?.length || !verdict) return;
    const tuned = results[0], base = results[1];
    const res = await fetch("/api/dev-eval/verdict", {
      method: "POST",
      body: JSON.stringify({
        model: tuned.model, prompt, system: system || undefined, output: tuned.output,
        verdict, score: score ? Number(score) : undefined, notes: notes || undefined,
        base_model: base?.model, base_output: base?.output, winner: winner || undefined,
      }),
    });
    const d = await res.json();
    if (res.ok) {
      setSaved(d.receipt_id || "recorded");
      setNotes(""); setScore("");
      loadVerdicts();
    } else setErr(d.error || "could not record verdict");
  };

  const isAB = (results?.length ?? 0) > 1;

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="text-xs font-semibold uppercase tracking-widest text-honey-300/80">Dev-Eval · human in the loop</div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-paper">Referee a tune</h1>
      <p className="mt-1 text-sm text-paper/50">
        Send a prompt to a tuned model (and a base model for A/B), read the output yourself, throw the
        flag. The referee applies the rulebook — pass | flag — and the call mints onto the receipt chain.
        We don&apos;t judge with a model; a human grades against a declared prompt.
      </p>

      {modelsNote && <div className="mt-4"><Callout title="Models">{modelsNote} — no model served yet? Once a tune lands and is served via ollama on the rig, it shows up here.</Callout></div>}

      <Card title="Prompt" className="mt-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs text-paper/50">Tune model
            <select value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 w-full rounded border border-white/10 bg-ink/60 px-2 py-1.5 font-mono text-xs text-paper">
              {models.length === 0 && <option value="">(none served)</option>}
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="text-xs text-paper/50">Base model (A/B, optional)
            <select value={baseModel} onChange={(e) => setBaseModel(e.target.value)} className="mt-1 w-full rounded border border-white/10 bg-ink/60 px-2 py-1.5 font-mono text-xs text-paper">
              <option value="">— none (single) —</option>
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        </div>
        <label className="mt-3 block text-xs text-paper/50">System prompt
          <textarea value={system} onChange={(e) => setSystem(e.target.value)} rows={4} className="mt-1 w-full rounded border border-white/10 bg-ink/60 p-2 font-mono text-xs text-paper/85" />
        </label>
        <label className="mt-3 block text-xs text-paper/50">User prompt
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder="e.g. A debt collector calls daily and threatens arrest over a 7-year-old credit card debt…" className="mt-1 w-full rounded border border-white/10 bg-ink/60 p-2 font-mono text-xs text-paper/85" />
        </label>
        <button onClick={run} disabled={running || !model || !prompt.trim()} className="mt-3 rounded bg-honey-300 px-4 py-1.5 text-sm font-semibold text-ink disabled:opacity-40">
          {running ? "running…" : isAB || baseModel ? "Run A/B" : "Run"}
        </button>
      </Card>

      {err && <div className="mt-4"><Callout title="Error">{err}</Callout></div>}

      {results && results.length > 0 && (
        <>
          <div className={`mt-4 grid gap-3 ${isAB ? "sm:grid-cols-2" : "grid-cols-1"}`}>
            <OutputPanel r={results[0]} label={isAB ? "TUNED" : undefined} />
            {isAB && <OutputPanel r={results[1]} label="BASE" />}
          </div>

          <Card title="Referee call" className="mt-4">
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => setVerdict("pass")} className={`rounded px-3 py-1.5 text-sm font-semibold ${verdict === "pass" ? "bg-emerald-400 text-ink" : "border border-white/15 text-paper/70"}`}>✓ pass</button>
              <button onClick={() => setVerdict("flag")} className={`rounded px-3 py-1.5 text-sm font-semibold ${verdict === "flag" ? "bg-rose-400 text-ink" : "border border-white/15 text-paper/70"}`}>⚑ flag</button>
              <input value={score} onChange={(e) => setScore(e.target.value)} placeholder="score 0-100" inputMode="numeric" className="w-28 rounded border border-white/10 bg-ink/60 px-2 py-1.5 text-xs text-paper" />
              {isAB && (
                <div className="flex items-center gap-1 text-xs text-paper/50">winner:
                  {(["tuned", "base", "tie"] as const).map((w) => (
                    <button key={w} onClick={() => setWinner(w)} className={`rounded px-2 py-1 ${winner === w ? "bg-honey-300 text-ink" : "border border-white/15 text-paper/70"}`}>{w}</button>
                  ))}
                </div>
              )}
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="notes — what's right, what's flagged (cite the rule)" className="mt-3 w-full rounded border border-white/10 bg-ink/60 p-2 font-mono text-xs text-paper/85" />
            <button onClick={submitVerdict} disabled={!verdict} className="mt-3 rounded bg-honey-300 px-4 py-1.5 text-sm font-semibold text-ink disabled:opacity-40">Mint verdict → chain</button>
            {saved && <span className="ml-3 text-xs text-emerald-300">minted · {saved}</span>}
          </Card>
        </>
      )}

      <div className="mt-8">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-paper/40">Recent verdicts ({verdicts.length})</div>
        {verdicts.length === 0 ? (
          <EmptyState title="No human verdicts yet">Run a prompt and throw the first flag — it lands on the receipt chain.</EmptyState>
        ) : (
          <div className="space-y-2">
            {verdicts.slice().reverse().map((v) => (
              <div key={v.receipt_id} className="rounded-lg border border-white/8 bg-white/[0.02] p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-paper/80">{v.metadata?.model}{v.metadata?.base_model ? ` vs ${v.metadata.base_model}` : ""}</span>
                  <span className="flex items-center gap-2">
                    <Badge value={v.metadata?.verdict || "?"} />
                    {v.metadata?.winner && <span className="text-honey-300">win: {v.metadata.winner}</span>}
                    {v.metadata?.score != null && <span className="text-paper/50">{v.metadata.score}</span>}
                  </span>
                </div>
                {v.metadata?.notes && <div className="mt-1 text-paper/45">{v.metadata.notes}</div>}
                <div className="mt-1 font-mono text-[10px] text-paper/25">seq {v.seq} · {v.receipt_id}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-paper/30">human in the loop · pass | flag · minted to the chain · 🐝</p>
    </div>
  );
}

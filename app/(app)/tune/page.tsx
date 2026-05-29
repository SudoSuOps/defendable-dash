"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Card, Callout, EmptyState } from "@/components/ui";

export const runtime = "edge";

type Gpu = { vram_used_gb: number; vram_total_gb: number; gpu_util: number; gpu_temp: number; power_w: number };
type Tune = {
  status?: string; phase?: string; model?: string; base?: string;
  step?: number; max_steps?: number; epoch?: number;
  loss?: number; lr?: number; eval_loss?: number; tps?: number;
  loss_history?: [number, number][];
  recipe?: Record<string, unknown>;
  started_at?: string; updated_at?: string; note?: string;
  verdict?: Record<string, unknown> | null;
  gpu_live?: Gpu | null;
};

function Sparkline({ pts }: { pts: [number, number][] }) {
  if (!pts || pts.length < 2) return <div className="h-16 text-xs text-paper/30">awaiting loss…</div>;
  const ys = pts.map((p) => p[1]);
  const min = Math.min(...ys), max = Math.max(...ys), span = max - min || 1;
  const W = 560, H = 64;
  const d = pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * W;
    const y = H - ((p[1] - min) / span) * (H - 6) - 3;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full" preserveAspectRatio="none">
      <path d={d} fill="none" stroke="#f6c64b" strokeWidth="1.5" />
    </svg>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
      <div className="text-[10px] font-medium uppercase tracking-widest text-paper/40">{label}</div>
      <div className="mt-1 font-mono text-lg text-paper">{value}</div>
      {sub && <div className="text-[10px] text-paper/40">{sub}</div>}
    </div>
  );
}

export default function TunePage() {
  const [t, setT] = useState<Tune | null>(null);
  const [err, setErr] = useState(false);
  const started = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch("/api/tune", { cache: "no-store" });
        const d = (await r.json()) as Tune;
        if (alive) { setT(d); setErr(false); }
      } catch { if (alive) setErr(true); }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const cooking = t && ["loading", "canary", "running", "training"].includes((t.status || "").toLowerCase());
  const pct = t?.step && t?.max_steps ? Math.min(100, Math.round((t.step / t.max_steps) * 100)) : 0;
  if (started.current === null && cooking) started.current = Date.now();
  const eta = (() => {
    if (!cooking || !t?.step || !t?.max_steps || !started.current || t.step < 2) return "—";
    const elapsed = (Date.now() - started.current) / 1000;
    const remain = (elapsed / t.step) * (t.max_steps - t.step);
    const m = Math.round(remain / 60);
    return m > 90 ? `~${(m / 60).toFixed(1)}h` : `~${m}m`;
  })();
  const g = t?.gpu_live;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="text-xs font-semibold uppercase tracking-widest text-honey-300/80">Tune · live cook</div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-paper">
        {t?.model || "Cook telemetry"}{" "}
        {t?.status && <Badge value={cooking ? "running" : t.status} />}
      </h1>
      <p className="mt-1 text-sm text-paper/50">
        Live from the rig — loss, GPU, step. No blackbox: you watch the 4B cook in real time.
      </p>

      {err && <div className="mt-4"><Callout title="Polling error">Couldn&apos;t reach /api/tune — retrying.</Callout></div>}

      {!cooking && (t?.status === "idle" || t?.status === "unavailable") && (
        <div className="mt-6">
          <EmptyState title={t.status === "unavailable" ? "Router not wired" : "No active cook"}>
            {t.note || "When a cook is running on the rig, its live loss / GPU / step land here. Nothing to fabricate."}
          </EmptyState>
        </div>
      )}

      {(cooking || t?.status === "completed" || t?.status === "failed") && (
        <>
          <Card title="Loss" subtitle={`${t?.phase || ""}${t?.epoch != null ? ` · epoch ${t.epoch.toFixed(2)}` : ""}`} className="mt-6">
            <div className="flex items-end justify-between">
              <div className="font-mono text-3xl text-honey-300">{t?.loss != null ? t.loss.toFixed(4) : "—"}</div>
              <div className="text-right text-xs text-paper/45">
                step <span className="font-mono text-paper/80">{t?.step ?? "—"}</span> / {t?.max_steps ?? "—"} · {pct}%
                {t?.eval_loss != null && <div>eval {t.eval_loss.toFixed(4)}</div>}
              </div>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-white/10">
              <div className="h-full bg-honey-300 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-3"><Sparkline pts={t?.loss_history || []} /></div>
          </Card>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="tok/s" value={t?.tps != null ? String(Math.round(t.tps)) : "—"} />
            <Stat label="ETA" value={eta} sub={`lr ${t?.lr != null ? t.lr.toExponential(1) : "—"}`} />
            <Stat label="VRAM" value={g ? `${g.vram_used_gb}` : "—"} sub={g ? `/ ${g.vram_total_gb} GB` : ""} />
            <Stat label="GPU" value={g ? `${g.gpu_temp}°C` : "—"} sub={g ? `${g.gpu_util}% · ${g.power_w}W` : ""} />
          </div>

          {t?.recipe && (
            <Card title="Recipe" className="mt-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-xs text-paper/60 sm:grid-cols-3">
                {Object.entries(t.recipe).map(([k, v]) => (
                  <div key={k}><span className="text-paper/35">{k}</span> {String(v)}</div>
                ))}
              </div>
            </Card>
          )}

          {t?.verdict && (
            <div className="mt-4">
              <Callout title="Verdict">
                <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">{JSON.stringify(t.verdict, null, 2)}</pre>
              </Callout>
            </div>
          )}
        </>
      )}

      <p className="mt-8 text-center text-xs text-paper/30">live · polling every 2s · 🐝 watch it cook · to the shed</p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Callout, Field, Spinner, inputClass } from "@/components/ui";
import type { AuthRequestResponse } from "@/lib/types";

type Stage = "email" | "token";

export default function LoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as AuthRequestResponse & { error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not send the link. Check the address and try again.");
        return;
      }
      setDevLink(data.dev_link ?? null);
      setStage("token");
    } catch {
      setError("Network error reaching the office. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "That token didn't verify. Request a fresh link.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Network error verifying the token. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen brand-grid">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <div className="text-xs font-semibold uppercase tracking-widest text-honey-300/80">
          🐝 DefendableDash · The Office
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-paper">Sign in to the office</h1>
        <p className="mt-1 text-sm text-paper/50">
          Member access by magic link. One login, the whole ecosystem — every run with the math
          re-derived, every receipt hash-chain verified.
        </p>

        <div className="mt-8 rounded-xl border border-white/8 bg-white/[0.02] p-6">
          {stage === "email" ? (
            <form onSubmit={requestLink} className="space-y-4">
              <Field label="Work email" hint="We'll send a one-time sign-in token.">
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="you@company.com"
                  className={inputClass}
                />
              </Field>
              <Button type="submit" disabled={busy || !email} className="w-full">
                {busy ? <Spinner label="Sending…" /> : "Send sign-in link"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="space-y-4">
              <Field label="Sign-in token" hint={`Sent to ${email}. Paste it below.`}>
                <input
                  type="text"
                  required
                  autoFocus
                  value={token}
                  onChange={(ev) => setToken(ev.target.value)}
                  placeholder="paste token"
                  className={`${inputClass} font-mono`}
                />
              </Field>
              {devLink && (
                <Callout title="Dev link">
                  <a href={devLink} className="break-all font-mono text-xs text-honey-300 underline">
                    {devLink}
                  </a>
                </Callout>
              )}
              <Button type="submit" disabled={busy || !token} className="w-full">
                {busy ? <Spinner label="Verifying…" /> : "Verify & enter"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStage("email");
                  setToken("");
                  setDevLink(null);
                  setError(null);
                }}
                className="block w-full text-center text-xs text-paper/45 hover:text-paper/70"
              >
                ← use a different email
              </button>
            </form>
          )}

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        </div>

        <p className="mt-8 text-center text-xs text-paper/30">
          Math and code, visible. No trust-me-bro. 🐝 to the shed.
        </p>
      </div>
    </main>
  );
}

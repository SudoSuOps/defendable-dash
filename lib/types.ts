// Shared TS types for the DefendableCloud + DefendableRouter API shapes the dash reads.
// Keep these aligned with the BFF contract — the pages narrow against them.

// ── Auth ───────────────────────────────────────────────────────────────────
export interface Me {
  id: string;
  email: string;
  org_id: string;
  org_name?: string | null;
  role?: "owner" | "member" | string;
  is_admin?: boolean;
}

export interface AuthVerifyResponse {
  access_token: string;
  user: { id: string; email: string; org_id: string };
}

export interface AuthRequestResponse {
  ok: boolean;
  dev_link?: string;
}

// ── Org / usage ──────────────────────────────────────────────────────────────
export interface OrgUsage {
  receipts_lifetime: number;
  receipts_this_month: number;
  org_seq: number;
  earned_lanes: string[];
}

// ── Runs ───────────────────────────────────────────────────────────────────
export type RunLane = "agent" | "dataset" | "compute" | string;
export type RunStatus = "draft" | "submitted" | "audited" | "approved" | "rejected" | string;
export type VerdictOutcome = "pass" | "fail" | "risk";
export type VerdictSeverity = "honey" | "jelly" | "propolis";

export interface Run {
  id: string;
  project_id: string;
  lane: RunLane;
  title: string;
  status: RunStatus;
  verdict?: VerdictOutcome | null;
  created_at: string;
}

export type CheckCategory = "schema" | "structure" | "evidence" | "math" | "policy";
export type CheckStatus = "pass" | "flag" | "skip" | "open";
export type CheckSeverity = "high" | "mid" | "low";

export interface Check {
  check_key: string;
  label?: string;
  category: CheckCategory;
  status: CheckStatus;
  severity?: CheckSeverity | null;
  detail: string;
}

export interface Verdict {
  outcome: VerdictOutcome;
  summary: string;
  score_100: number;
  severity: VerdictSeverity;
  client_ready: boolean;
  recommended_action: string;
  checks_passed: number;
  checks_failed: number;
}

// Full run detail (/runs/{id}) — nested blobs are backend-shaped, kept loose + narrowable.
// `verdict` widens from the summary outcome (in Run) to the full Verdict object here.
export interface RunDetail extends Omit<Run, "verdict"> {
  flight_sheet?: Record<string, unknown> | null;
  submission?: Record<string, unknown> | null;
  evidence?: Record<string, unknown> | null;
  checks?: Check[];
  verdict?: Verdict | VerdictOutcome | null;
  approval?: Record<string, unknown> | null;
  receipt?: Record<string, unknown> | null;
}

// ── Receipts (cloud) ─────────────────────────────────────────────────────────
export interface ReceiptSummaryEval {
  lane?: string;
  run_title?: string;
  outcome?: string;
  severity?: string;
  score_100?: number;
}
export interface ReceiptSummaryCook {
  lift?: number;
  eval_before?: number;
  eval_after?: number;
}
export interface ReceiptSummaryIncident {
  kind?: string;
  title?: string;
  severity?: string;
  status?: string;
}
export type ReceiptSummary = Partial<
  ReceiptSummaryEval & ReceiptSummaryCook & ReceiptSummaryIncident
> &
  Record<string, unknown>;

export interface ReceiptRollup {
  receipt_id: string;
  org_seq: number;
  payload_schema: string;
  receipt_sha256: string;
  share_url: string;
  created_at: string;
  summary: ReceiptSummary;
}

export interface RecentReceipts {
  rollups: ReceiptRollup[];
}

// ── Ledger ───────────────────────────────────────────────────────────────────
export interface LedgerEntry {
  receipt_id: string;
  org_seq: number;
  parent_hash: string;
  receipt_sha256: string;
  created_at: string;
}

export interface Ledger {
  entries: LedgerEntry[];
}

export interface LedgerVerify {
  ok: boolean;
  receipts_checked: number;
  errors: string[];
}

// Router-side chain integrity check (same shape as cloud's).
export interface RouterVerify {
  ok: boolean;
  receipts_checked: number;
  errors: string[];
}

// Merged ledger payload the dash page reads: the cloud org chain + the optional
// sovereign router chain (null when the router isn't wired — shown honestly).
export interface LedgerMerged {
  cloud: Ledger;
  router: RouterReceipts | null;
}

// Combined live-verify payload: both chains recomputed, plus a single honest
// combined verdict. When the router is unwired, `router` is null and the
// combined verdict reflects only the cloud chain (never fabricated as "ok").
// Extends LedgerVerify so the top-level ok/receipts_checked/errors stay
// backwards-compatible for the Overview LedgerBadge (which reads the cloud view).
export interface LedgerVerifyCombined extends LedgerVerify {
  cloud: LedgerVerify;
  router: RouterVerify | null;
  router_wired: boolean;
}

// ── Cooks ────────────────────────────────────────────────────────────────────
export interface Cook {
  id: string;
  run_id: string;
  base_model: string;
  dataset_id: string;
  status: string;
  eval_before: number;
  eval_after: number;
  lift: number;
  pairs: number;
  metrics?: Record<string, unknown>;
  receipt_id?: string;
}

// ── Router / fleet (server-to-server, may be null when unwired) ───────────────
export interface FleetSummary {
  active_members_count: number;
  total_datasets_count: number;
  compute_nodes_available: number;
  compute_nodes_busy: number;
  queued_jobs: number;
  running_jobs: number;
  completed_jobs: number;
  estimated_revenue_from_jobs: number;
  annual_membership_revenue: number;
  workers_online: number;
  workers_offline: number;
  workers_busy: number;
  stale_workers: number;
  active_leases: number;
}

export interface FleetWorker {
  id: string;
  node_id: string;
  name: string;
  hostname: string;
  status: string;
  last_heartbeat_at: string;
  gpu_skus: string[];
}

export interface RouterReceipt {
  receipt_id: string;
  seq: number;
  receipt_type: string;
  member_id: string;
  amount_usd: number;
  parent_hash: string;
  checksum_sha256: string;
  created_at: string;
}

export interface RouterReceipts {
  count: number;
  receipts: RouterReceipt[];
}

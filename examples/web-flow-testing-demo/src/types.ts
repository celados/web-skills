export type DemoScenario =
  | "happy"
  | "job-running"
  | "webhook-delayed"
  | "owner-mismatch"
  | "ui-success-backend-failed"
  | "backend-ready-ui-stale"
  | "console-error";

export type RequestStatus = "awaiting_payment" | "paid" | "running" | "ready" | "failed";

export type DemoUser = {
  email: string;
  name: string;
  authUserId: string;
  appUserId: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DemoOrder = {
  publicId: string;
  status: "none" | "pending_webhook" | "settled" | "failed";
  amountCents: number;
  currency: "usd";
};

export type DemoJob = {
  publicId: string;
  status: "not_started" | "queued" | "running" | "ready" | "failed";
  phase: "none" | "waiting" | "rendering" | "complete" | "stalled" | "error";
};

export type DemoProject = {
  publicId: string;
  name: string;
  status: "not_created" | "building" | "ready" | "failed";
};

export type DemoUiState = {
  resultLabel: "Scan complete" | "Payment received" | "Project ready" | "Build failed";
  gateLabel: "Unlock & build - $2 test mode" | "Payment received" | "Unlocked" | "Retry needed";
  visibleStatus: RequestStatus;
  stale: boolean;
  errorBanner?: string;
};

export type DemoFlow = {
  publicId: string;
  scenario: DemoScenario;
  sourceUrl: string;
  accountEmail: string;
  status: RequestStatus;
  scanStatus: "complete";
  ui: DemoUiState;
  order: DemoOrder;
  job: DemoJob;
  project: DemoProject;
  submitCount: number;
  duplicateOf: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DemoState = {
  environment: "local";
  appBaseUrl: string;
  sessionEmail: string | null;
  counters: {
    users: number;
    requests: number;
    projects: number;
  };
  users: Record<string, DemoUser>;
  requests: Record<string, DemoFlow>;
};

export type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; hint?: string } };

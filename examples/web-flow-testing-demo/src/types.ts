export type RequestStatus = "awaiting_payment" | "paid" | "ready";

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
  status: "none" | "settled";
  amountCents: number;
  currency: "usd";
};

export type DemoJob = {
  publicId: string;
  status: "not_started" | "queued" | "ready";
  phase: "none" | "waiting" | "complete";
};

export type DemoProject = {
  publicId: string;
  name: string;
  status: "not_created" | "ready";
};

export type DemoFlow = {
  publicId: string;
  sourceUrl: string;
  accountEmail: string;
  status: RequestStatus;
  scanStatus: "complete";
  order: DemoOrder;
  job: DemoJob;
  project: DemoProject;
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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { DemoFlow, DemoState, DemoUser, RequestStatus } from "./types";

export const stateFilePath = resolve(process.cwd(), ".demo-state/state.json");
const demoBaseUrl = "http://127.0.0.1:5174";

export type EnsureUserInput = {
  email?: string;
  name?: string;
  execute?: boolean;
};

export type CreateRequestInput = {
  email?: string;
  sourceUrl?: string;
};

export type CheckoutRequestInput = {
  publicId?: string;
};

export function createEmptyState(): DemoState {
  return {
    environment: "local",
    appBaseUrl: demoBaseUrl,
    sessionEmail: null,
    counters: {
      users: 0,
      requests: 0,
      projects: 0,
    },
    users: {},
    requests: {},
  };
}

export function resetState() {
  const state = createEmptyState();
  writeState(state);
  return state;
}

export function readState() {
  if (!existsSync(stateFilePath)) {
    return resetState();
  }
  return JSON.parse(readFileSync(stateFilePath, "utf8")) as DemoState;
}

export function writeState(state: DemoState) {
  mkdirSync(dirname(stateFilePath), { recursive: true });
  writeFileSync(stateFilePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export function ensureUser(input: EnsureUserInput) {
  const email = normalizeEmail(input.email);
  const name = normalizeName(input.name);
  const state = readState();
  const existing = state.users[email];
  if (existing) {
    return {
      dryRun: false,
      entityStatus: "found" as const,
      user: existing,
    };
  }

  const now = new Date().toISOString();
  const nextNumber = state.counters.users + 1;
  const user: DemoUser = {
    email,
    name,
    authUserId: `auth_demo_${String(nextNumber).padStart(3, "0")}`,
    appUserId: `user_demo_${String(nextNumber).padStart(3, "0")}`,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  };

  if (!input.execute) {
    return {
      dryRun: true,
      entityStatus: "would_create" as const,
      user,
    };
  }

  state.counters.users = nextNumber;
  state.users[email] = user;
  state.sessionEmail = email;
  writeState(state);
  return {
    dryRun: false,
    entityStatus: "created" as const,
    user,
  };
}

export function setSession(input: { email: string | null }) {
  const state = readState();
  state.sessionEmail = input.email ? normalizeEmail(input.email) : null;
  writeState(state);
  return state;
}

export function getUserSnapshot(email?: string) {
  const normalizedEmail = normalizeEmail(email);
  const state = readState();
  const user = state.users[normalizedEmail] ?? null;
  if (!user) {
    throw new Error(`No demo user found for ${normalizedEmail}. Run user ensure --execute first.`);
  }
  return {
    environment: state.environment,
    entityStatus: "found" as const,
    user,
    account: {
      accountId: `acct_${user.appUserId}`,
      kind: "personal",
      status: "active",
      displayName: user.name,
    },
  };
}

export function createRequest(input: CreateRequestInput) {
  const email = normalizeEmail(input.email);
  const sourceUrl = normalizeSourceUrl(input.sourceUrl);
  const state = readState();
  const user = state.users[email];
  if (!user) {
    throw new Error(`No demo user found for ${email}. Run user ensure --execute first.`);
  }

  const now = new Date().toISOString();
  const requestNumber = state.counters.requests + 1;
  const projectNumber = state.counters.projects + 1;
  const publicId = `req_demo_${String(requestNumber).padStart(3, "0")}`;
  const projectId = `proj_demo_${String(projectNumber).padStart(3, "0")}`;
  const flow: DemoFlow = {
    publicId,
    sourceUrl,
    accountEmail: email,
    status: "awaiting_payment",
    scanStatus: "complete",
    order: {
      publicId: `ord_demo_${String(requestNumber).padStart(3, "0")}`,
      status: "none",
      amountCents: 200,
      currency: "usd",
    },
    job: {
      publicId: `job_demo_${String(requestNumber).padStart(3, "0")}`,
      status: "not_started",
      phase: "none",
    },
    project: {
      publicId: projectId,
      name: projectNameFromUrl(sourceUrl),
      status: "not_created",
    },
    createdAt: now,
    updatedAt: now,
  };

  state.counters.requests = requestNumber;
  state.counters.projects = projectNumber;
  state.requests[publicId] = flow;
  writeState(state);
  return flow;
}

export function checkoutRequest(input: CheckoutRequestInput) {
  const publicId = normalizePublicId(input.publicId);
  const state = readState();
  const flow = state.requests[publicId];
  if (!flow) {
    throw new Error(`No demo flow found for ${publicId}.`);
  }

  const updatedFlow: DemoFlow = {
    ...flow,
    status: "ready",
    order: {
      ...flow.order,
      status: "settled",
    },
    job: {
      ...flow.job,
      status: "ready",
      phase: "complete",
    },
    project: {
      ...flow.project,
      status: "ready",
    },
    updatedAt: new Date().toISOString(),
  };
  state.requests[publicId] = updatedFlow;
  writeState(state);
  return updatedFlow;
}

export function getFlowSnapshot(publicId?: string) {
  const normalizedPublicId = normalizePublicId(publicId);
  const state = readState();
  const flow = state.requests[normalizedPublicId] ?? null;
  if (!flow) {
    throw new Error(`No demo flow found for ${normalizedPublicId}.`);
  }
  return {
    environment: state.environment,
    entityStatus: "found" as const,
    flow,
  };
}

export function assertFlowStatus(input: { publicId?: string; expectStatus?: string }) {
  const snapshot = getFlowSnapshot(input.publicId);
  const expectStatus = normalizeExpectedStatus(input.expectStatus);
  const actualStatus = snapshot.flow.status;
  const passed = actualStatus === expectStatus;
  return {
    ...snapshot,
    assertion: {
      field: "flow.status",
      expected: expectStatus,
      actual: actualStatus,
      passed,
    },
  };
}

function normalizeEmail(email?: string) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) {
    throw new Error("Email is required.");
  }
  return normalized;
}

function normalizeName(name?: string) {
  return name?.trim() || "Agent Smoke";
}

function normalizeSourceUrl(sourceUrl?: string) {
  const normalized = sourceUrl?.trim();
  if (!normalized) {
    throw new Error("Source URL is required.");
  }
  try {
    return new URL(normalized).toString();
  } catch {
    throw new Error(`Source URL must be absolute. Received: ${normalized}`);
  }
}

function normalizePublicId(publicId?: string) {
  const normalized = publicId?.trim();
  if (!normalized) {
    throw new Error("Public ID is required.");
  }
  return normalized;
}

function normalizeExpectedStatus(status?: string) {
  const normalized = status?.trim();
  const allowed: RequestStatus[] = ["awaiting_payment", "paid", "ready"];
  if (!allowed.includes(normalized as RequestStatus)) {
    throw new Error(`Expected status must be one of: ${allowed.join(", ")}.`);
  }
  return normalized as RequestStatus;
}

function projectNameFromUrl(sourceUrl: string) {
  const url = new URL(sourceUrl);
  return `${url.hostname} rebuild`;
}

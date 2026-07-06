import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { DemoFlow, DemoScenario, DemoState, DemoUiState, DemoUser, RequestStatus } from "./types";

export const stateFilePath = resolve(process.cwd(), ".demo-state/state.json");
export const demoScenarios: DemoScenario[] = [
  "happy",
  "job-running",
  "webhook-delayed",
  "owner-mismatch",
  "ui-success-backend-failed",
  "backend-ready-ui-stale",
  "console-error",
];

const demoBaseUrl = "http://127.0.0.1:5174";
const ownerMismatchEmail = "owner-only@example.com";

export type EnsureUserInput = {
  email?: string;
  name?: string;
  execute?: boolean;
};

export type CreateRequestInput = {
  email?: string;
  sourceUrl?: string;
  scenario?: string;
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
  const user = createUserRecord({
    email,
    name,
    number: nextNumber,
    now,
  });

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
  const scenario = normalizeScenario(input.scenario);
  const state = readState();
  const user = state.users[email];
  if (!user) {
    throw new Error(`No demo user found for ${email}. Run user ensure --execute first.`);
  }

  const duplicate = findDuplicateRequest(state, email, sourceUrl);
  if (duplicate && scenario === "happy") {
    const updatedFlow = {
      ...duplicate,
      submitCount: duplicate.submitCount + 1,
      duplicateOf: duplicate.publicId,
      updatedAt: new Date().toISOString(),
    };
    state.requests[duplicate.publicId] = updatedFlow;
    writeState(state);
    return updatedFlow;
  }

  const now = new Date().toISOString();
  const requestNumber = state.counters.requests + 1;
  const projectNumber = state.counters.projects + 1;
  const publicId = `req_demo_${String(requestNumber).padStart(3, "0")}`;
  const projectId = `proj_demo_${String(projectNumber).padStart(3, "0")}`;
  const flow = buildFlow({
    publicId,
    projectId,
    requestNumber,
    scenario,
    sourceUrl,
    actorEmail: email,
    now,
  });

  state.counters.requests = requestNumber;
  state.counters.projects = projectNumber;
  state.requests[publicId] = flow;
  ensureScenarioOwner(state, scenario, now);
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

  const updatedFlow = completeCheckout(flow);
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

export function assertFlowOwner(input: { publicId?: string; email?: string }) {
  const snapshot = getFlowSnapshot(input.publicId);
  const expectedOwner = normalizeEmail(input.email);
  const actualOwner = snapshot.flow.accountEmail;
  const passed = actualOwner === expectedOwner;
  return {
    ...snapshot,
    assertion: {
      field: "flow.accountEmail",
      expected: expectedOwner,
      actual: actualOwner,
      passed,
    },
  };
}

function buildFlow(input: {
  publicId: string;
  projectId: string;
  requestNumber: number;
  scenario: DemoScenario;
  sourceUrl: string;
  actorEmail: string;
  now: string;
}): DemoFlow {
  const ownerEmail = input.scenario === "owner-mismatch" ? ownerMismatchEmail : input.actorEmail;
  const base = createBaseFlow({
    publicId: input.publicId,
    projectId: input.projectId,
    requestNumber: input.requestNumber,
    scenario: input.scenario,
    sourceUrl: input.sourceUrl,
    accountEmail: ownerEmail,
    now: input.now,
  });

  if (input.scenario === "job-running") {
    return {
      ...base,
      status: "running",
      ui: createUiState("Payment received", "Payment received", "running", false),
      order: { ...base.order, status: "settled" },
      job: { ...base.job, status: "running", phase: "rendering" },
      project: { ...base.project, status: "building" },
    };
  }

  if (input.scenario === "webhook-delayed") {
    return {
      ...base,
      status: "paid",
      ui: createUiState("Payment received", "Payment received", "paid", false),
      order: { ...base.order, status: "pending_webhook" },
      job: { ...base.job, status: "queued", phase: "waiting" },
    };
  }

  if (input.scenario === "ui-success-backend-failed") {
    return {
      ...base,
      status: "awaiting_payment",
      ui: createUiState("Project ready", "Unlocked", "ready", true),
      order: { ...base.order, status: "none" },
      job: { ...base.job, status: "not_started", phase: "none" },
      project: { ...base.project, status: "not_created" },
    };
  }

  if (input.scenario === "backend-ready-ui-stale") {
    return {
      ...base,
      status: "ready",
      ui: createUiState("Scan complete", "Unlock & build - $2 test mode", "awaiting_payment", true),
      order: { ...base.order, status: "settled" },
      job: { ...base.job, status: "ready", phase: "complete" },
      project: { ...base.project, status: "ready" },
    };
  }

  if (input.scenario === "console-error") {
    return {
      ...base,
      ui: {
        ...base.ui,
        errorBanner: "Intentional console error scenario. Inspect browser logs before reporting pass.",
      },
    };
  }

  return base;
}

function createBaseFlow(input: {
  publicId: string;
  projectId: string;
  requestNumber: number;
  scenario: DemoScenario;
  sourceUrl: string;
  accountEmail: string;
  now: string;
}): DemoFlow {
  return {
    publicId: input.publicId,
    scenario: input.scenario,
    sourceUrl: input.sourceUrl,
    accountEmail: input.accountEmail,
    status: "awaiting_payment",
    scanStatus: "complete",
    ui: createUiState("Scan complete", "Unlock & build - $2 test mode", "awaiting_payment", false),
    order: {
      publicId: `ord_demo_${String(input.requestNumber).padStart(3, "0")}`,
      status: "none",
      amountCents: 200,
      currency: "usd",
    },
    job: {
      publicId: `job_demo_${String(input.requestNumber).padStart(3, "0")}`,
      status: "not_started",
      phase: "none",
    },
    project: {
      publicId: input.projectId,
      name: projectNameFromUrl(input.sourceUrl),
      status: "not_created",
    },
    submitCount: 1,
    duplicateOf: null,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

function completeCheckout(flow: DemoFlow): DemoFlow {
  if (flow.scenario !== "happy" && flow.scenario !== "console-error") {
    return {
      ...flow,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    ...flow,
    status: "ready",
    ui: createUiState("Project ready", "Unlocked", "ready", false),
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
}

function createUiState(
  resultLabel: DemoUiState["resultLabel"],
  gateLabel: DemoUiState["gateLabel"],
  visibleStatus: RequestStatus,
  stale: boolean,
): DemoUiState {
  return {
    resultLabel,
    gateLabel,
    visibleStatus,
    stale,
  };
}

function findDuplicateRequest(state: DemoState, email: string, sourceUrl: string) {
  return Object.values(state.requests).find(
    (request) => request.accountEmail === email && request.sourceUrl === sourceUrl,
  );
}

function ensureScenarioOwner(state: DemoState, scenario: DemoScenario, now: string) {
  if (scenario !== "owner-mismatch" || state.users[ownerMismatchEmail]) return;
  const nextNumber = state.counters.users + 1;
  state.counters.users = nextNumber;
  state.users[ownerMismatchEmail] = createUserRecord({
    email: ownerMismatchEmail,
    name: "Owner Only",
    number: nextNumber,
    now,
  });
}

function createUserRecord(input: { email: string; name: string; number: number; now: string }): DemoUser {
  return {
    email: input.email,
    name: input.name,
    authUserId: `auth_demo_${String(input.number).padStart(3, "0")}`,
    appUserId: `user_demo_${String(input.number).padStart(3, "0")}`,
    emailVerified: true,
    createdAt: input.now,
    updatedAt: input.now,
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
  const allowed: RequestStatus[] = ["awaiting_payment", "paid", "running", "ready", "failed"];
  if (!allowed.includes(normalized as RequestStatus)) {
    throw new Error(`Expected status must be one of: ${allowed.join(", ")}.`);
  }
  return normalized as RequestStatus;
}

function normalizeScenario(scenario?: string) {
  const normalized = scenario?.trim() || "happy";
  if (!demoScenarios.includes(normalized as DemoScenario)) {
    throw new Error(`Scenario must be one of: ${demoScenarios.join(", ")}.`);
  }
  return normalized as DemoScenario;
}

function projectNameFromUrl(sourceUrl: string) {
  const url = new URL(sourceUrl);
  return `${url.hostname} rebuild`;
}

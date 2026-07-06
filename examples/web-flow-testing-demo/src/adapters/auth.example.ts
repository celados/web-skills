import type {
  ApiKeyCreateInput,
  ApiKeyCreateResult,
  ApiKeyRevokeInput,
  ApiKeyRevokeResult,
  AuthProviderAdapter,
  AuthUserSnapshot,
  EnsureUserInput,
  EnsureUserResult,
  UserSnapshotInput,
} from "./types";
import type { DemoApiKey, DemoState, DemoUser } from "../types";

import { ensureUser as ensureDemoUser, getUserSnapshot, readState, writeState } from "../state";

const provider = "demo-auth";
const environment = "local";
const apiKeyPrefix = "demo_test_";
const apiKeyStartLength = 12;
const cloneApiPermissions = {
  clone_requests: ["create", "read"],
  source_downloads: ["create"],
};

export const demoAuthAdapter: AuthProviderAdapter = {
  ensureUser(input: EnsureUserInput) {
    const result = ensureDemoUser({
      email: input.email,
      name: input.name,
      execute: input.execute === true,
    });
    return {
      ...snapshotFromUser(result.user),
      dryRun: result.dryRun,
      entityStatus: result.entityStatus,
    };
  },
  snapshotUser(input: UserSnapshotInput) {
    const snapshot = getUserSnapshot(input.email);
    return {
      environment,
      provider,
      entityStatus: snapshot.entityStatus,
      user: snapshot.user,
      account: {
        accountId: snapshot.account.accountId,
        kind: "personal",
        status: "active",
        displayName: snapshot.account.displayName,
      },
      memberships: personalMemberships(snapshot.user),
      truthSource: authTruthSource(),
    };
  },
  createApiKey(input: ApiKeyCreateInput) {
    return createDemoApiKey(input);
  },
  revokeApiKey(input: ApiKeyRevokeInput) {
    return revokeDemoApiKey(input);
  },
};

function createDemoApiKey(input: ApiKeyCreateInput): ApiKeyCreateResult {
  const state = readState();
  const user = findUserByBetterAuthUserId(state, input.betterAuthUserId);
  if (!user) {
    throw new Error(`No demo auth user found for ${input.betterAuthUserId}.`);
  }

  if (input.execute !== true) {
    return {
      environment,
      provider,
      dryRun: true,
      betterAuthUserId: input.betterAuthUserId,
      truthSource: authTruthSource(),
    };
  }

  const now = new Date().toISOString();
  const nextNumber = state.counters.apiKeys + 1;
  const rawKey = createRawApiKey();
  const apiKey: DemoApiKey = {
    id: `key_demo_${String(nextNumber).padStart(3, "0")}`,
    name: normalizeApiKeyName(input.name),
    betterAuthUserId: user.authUserId,
    prefix: apiKeyPrefix,
    start: rawKey.slice(0, apiKeyStartLength),
    enabled: true,
    permissions: cloneApiPermissions,
    createdAt: now,
    updatedAt: now,
    revokedAt: null,
  };

  state.counters.apiKeys = nextNumber;
  state.apiKeys[apiKey.id] = apiKey;
  writeState(state);

  return {
    environment,
    provider,
    dryRun: false,
    betterAuthUserId: input.betterAuthUserId,
    apiKey: {
      ...apiKey,
      key: rawKey,
    },
    truthSource: authTruthSource(),
  };
}

function revokeDemoApiKey(input: ApiKeyRevokeInput): ApiKeyRevokeResult | null {
  const state = readState();
  const existing = state.apiKeys[input.keyId] ?? null;
  if (!existing) {
    return null;
  }

  if (input.execute !== true) {
    return {
      environment,
      provider,
      dryRun: true,
      apiKey: existing,
      truthSource: authTruthSource(),
    };
  }

  const updated: DemoApiKey = {
    ...existing,
    enabled: false,
    updatedAt: new Date().toISOString(),
    revokedAt: new Date().toISOString(),
  };
  state.apiKeys[input.keyId] = updated;
  writeState(state);
  return {
    environment,
    provider,
    dryRun: false,
    apiKey: updated,
    truthSource: authTruthSource(),
  };
}

function snapshotFromUser(user: DemoUser): EnsureUserResult {
  return {
    environment,
    provider,
    dryRun: false,
    entityStatus: "found",
    user,
    account: {
      accountId: `acct_${user.appUserId}`,
      kind: "personal",
      status: "active",
      displayName: user.name,
    },
    memberships: personalMemberships(user),
    truthSource: authTruthSource(),
  };
}

function personalMemberships(user: DemoUser): AuthUserSnapshot["memberships"] {
  return [
    {
      membershipId: `member_${user.appUserId}`,
      role: "owner",
      workspaceId: `workspace_${user.appUserId}`,
    },
  ];
}

function findUserByBetterAuthUserId(state: DemoState, betterAuthUserId: string) {
  return Object.values(state.users).find((user) => user.authUserId === betterAuthUserId) ?? null;
}

function normalizeApiKeyName(name?: string) {
  return name?.trim() || "Agent smoke key";
}

function createRawApiKey() {
  return `${apiKeyPrefix}${crypto.randomUUID().replaceAll("-", "")}`;
}

function authTruthSource() {
  return {
    kind: "demo_auth_projection",
    provider,
    stateOwner: "web-flow-testing-demo",
    tables: ["demo.users", "demo.apiKeys"],
  } as const;
}

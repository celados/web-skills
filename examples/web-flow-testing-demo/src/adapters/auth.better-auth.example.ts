import type {
  ApiKeyCreateInput,
  ApiKeyPublicRecord,
  ApiKeyRevokeInput,
  AuthProviderAdapter,
  AuthUserSnapshot,
  EnsureUserInput,
  EnsureUserResult,
  UserSnapshotInput,
} from "./types";
import type { DemoApiKey, DemoUser } from "../types";

type BetterAuthUserRecord = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  disabled?: boolean;
  createdAt: string;
  updatedAt: string;
};

type AppAccountRecord = {
  accountId: string;
  displayName: string;
  kind: "personal" | "organization";
  status: "active" | "disabled";
  memberships: AuthUserSnapshot["memberships"];
};

type BetterAuthApiKeyRecord = {
  id: string;
  name: string;
  betterAuthUserId: string;
  prefix: string;
  start: string;
  enabled: boolean;
  permissions: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
  key?: string;
};

export type BetterAuthOperatorBoundary = {
  resolveUserByEmail: (email: string) => Promise<BetterAuthUserRecord | null>;
  createTestUser: (input: {
    email: string;
    name: string;
    markEmailVerified: boolean;
  }) => Promise<BetterAuthUserRecord>;
  readAppAccountForBetterAuthUser: (betterAuthUserId: string) => Promise<AppAccountRecord | null>;
  createApiKey: (input: {
    betterAuthUserId: string;
    name: string;
    permissions: Record<string, string[]>;
  }) => Promise<BetterAuthApiKeyRecord>;
  readApiKey: (keyId: string) => Promise<BetterAuthApiKeyRecord | null>;
  revokeApiKey: (keyId: string) => Promise<BetterAuthApiKeyRecord | null>;
};

export type BetterAuthAdapterOptions = {
  environment: "test" | "staging" | "production";
  operator: BetterAuthOperatorBoundary;
};

const provider = "better-auth";
const cloneApiPermissions = {
  clone_requests: ["create", "read"],
  source_downloads: ["create"],
};

export function createBetterAuthOperatorAdapter(
  options: BetterAuthAdapterOptions,
): AuthProviderAdapter {
  return {
    async ensureUser(input: EnsureUserInput) {
      const existing = await options.operator.resolveUserByEmail(input.email);
      if (existing) {
        return await userResultFromBetterAuthRecord(options, existing, false, "found");
      }

      if (input.execute !== true) {
        const projected = projectedUser(input);
        return await userResultFromBetterAuthRecord(options, projected, true, "would_create");
      }

      const created = await options.operator.createTestUser({
        email: input.email,
        name: input.name?.trim() || "Agent Smoke",
        markEmailVerified: true,
      });
      return await userResultFromBetterAuthRecord(options, created, false, "created");
    },
    async snapshotUser(input: UserSnapshotInput) {
      const user = await options.operator.resolveUserByEmail(input.email);
      if (!user) {
        throw new Error(`No Better Auth user found for ${input.email}.`);
      }
      return await snapshotFromBetterAuthRecord(options, user);
    },
    async createApiKey(input: ApiKeyCreateInput) {
      if (input.execute !== true) {
        return {
          environment: options.environment,
          provider,
          dryRun: true,
          betterAuthUserId: input.betterAuthUserId,
          truthSource: betterAuthTruthSource(),
        };
      }

      const key = await options.operator.createApiKey({
        betterAuthUserId: input.betterAuthUserId,
        name: input.name?.trim() || "Agent smoke key",
        permissions: cloneApiPermissions,
      });
      return {
        environment: options.environment,
        provider,
        dryRun: false,
        betterAuthUserId: input.betterAuthUserId,
        apiKey: toPublicApiKey(key),
        truthSource: betterAuthTruthSource(),
      };
    },
    async revokeApiKey(input: ApiKeyRevokeInput) {
      const key =
        input.execute === true
          ? await options.operator.revokeApiKey(input.keyId)
          : await options.operator.readApiKey(input.keyId);
      if (!key) return null;
      return {
        environment: options.environment,
        provider,
        dryRun: input.execute !== true,
        apiKey: toPublicApiKey(key),
        truthSource: betterAuthTruthSource(),
      };
    },
  };
}

async function userResultFromBetterAuthRecord(
  options: BetterAuthAdapterOptions,
  record: BetterAuthUserRecord,
  dryRun: boolean,
  entityStatus: EnsureUserResult["entityStatus"],
): Promise<EnsureUserResult> {
  return {
    ...(await snapshotFromBetterAuthRecord(options, record)),
    dryRun,
    entityStatus,
  };
}

async function snapshotFromBetterAuthRecord(
  options: BetterAuthAdapterOptions,
  record: BetterAuthUserRecord,
): Promise<AuthUserSnapshot> {
  const account = await options.operator.readAppAccountForBetterAuthUser(record.id);
  return {
    environment: options.environment,
    provider,
    entityStatus: "found",
    user: toDemoUser(record),
    account: account
      ? {
          accountId: account.accountId,
          kind: account.kind,
          status: account.status,
          displayName: account.displayName,
        }
      : {
          accountId: `missing_app_account_${record.id}`,
          kind: "personal",
          status: "disabled",
          displayName: record.name,
        },
    memberships: account?.memberships ?? [],
    truthSource: betterAuthTruthSource(),
  };
}

function projectedUser(input: EnsureUserInput): BetterAuthUserRecord {
  const now = new Date().toISOString();
  return {
    id: `would_create:${input.email.toLowerCase()}`,
    email: input.email,
    name: input.name?.trim() || "Agent Smoke",
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  };
}

function toDemoUser(record: BetterAuthUserRecord): DemoUser {
  return {
    email: record.email,
    name: record.name,
    authUserId: record.id,
    appUserId: `app_${record.id}`,
    emailVerified: record.emailVerified,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toPublicApiKey(record: BetterAuthApiKeyRecord): ApiKeyPublicRecord & { key?: string } {
  const apiKey: DemoApiKey = {
    id: record.id,
    name: record.name,
    betterAuthUserId: record.betterAuthUserId,
    prefix: record.prefix,
    start: record.start,
    enabled: record.enabled,
    permissions: record.permissions,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    revokedAt: record.revokedAt,
  };
  return {
    ...apiKey,
    ...(record.key ? { key: record.key } : {}),
  };
}

function betterAuthTruthSource() {
  return {
    kind: "better_auth_operator_projection",
    provider,
    stateOwner: "application-backend",
    tables: ["better_auth.user", "better_auth.apikey", "app_users", "accounts"],
  } as const;
}

import type { DemoApiKey, DemoFlow, DemoUser } from "../types";

export type AdapterEnvironment = "local" | "test" | "staging" | "production";

export type AdapterTruthSource = {
  kind: string;
  stateOwner: string;
  provider?: string;
  tables?: readonly string[];
};

export type EnsureUserInput = {
  email: string;
  name?: string;
  execute?: boolean;
};

export type UserSnapshotInput = {
  email: string;
};

export type ApiKeyCreateInput = {
  betterAuthUserId: string;
  name?: string;
  execute?: boolean;
};

export type ApiKeyRevokeInput = {
  keyId: string;
  execute?: boolean;
};

export type AuthUserSnapshot = {
  environment: AdapterEnvironment;
  provider: string;
  entityStatus: "found";
  user: DemoUser;
  account: {
    accountId: string;
    kind: "personal" | "organization";
    status: "active" | "disabled";
    displayName: string;
  };
  memberships: Array<{
    membershipId: string;
    role: string;
    workspaceId: string;
  }>;
  truthSource: AdapterTruthSource;
};

export type EnsureUserResult = Omit<AuthUserSnapshot, "entityStatus"> & {
  dryRun: boolean;
  entityStatus: "found" | "created" | "would_create";
};

export type ApiKeyPublicRecord = Omit<DemoApiKey, "permissions"> & {
  permissions: Record<string, string[]>;
};

export type ApiKeyCreateResult = {
  environment: AdapterEnvironment;
  provider: string;
  dryRun: boolean;
  betterAuthUserId: string;
  apiKey?: ApiKeyPublicRecord & {
    key?: string;
  };
  truthSource: AdapterTruthSource;
};

export type ApiKeyRevokeResult = {
  environment: AdapterEnvironment;
  provider: string;
  dryRun: boolean;
  apiKey: ApiKeyPublicRecord;
  truthSource: AdapterTruthSource;
};

export type AuthProviderAdapter = {
  ensureUser: (input: EnsureUserInput) => Promise<EnsureUserResult> | EnsureUserResult;
  snapshotUser: (input: UserSnapshotInput) => Promise<AuthUserSnapshot> | AuthUserSnapshot;
  createApiKey: (input: ApiKeyCreateInput) => Promise<ApiKeyCreateResult> | ApiKeyCreateResult;
  revokeApiKey: (input: ApiKeyRevokeInput) => Promise<ApiKeyRevokeResult | null> | ApiKeyRevokeResult | null;
};

export type PaymentSnapshotInput = {
  publicId: string;
};

export type PaymentSnapshot = {
  environment: AdapterEnvironment;
  provider: string;
  entityStatus: "found";
  order: DemoFlow["order"];
  flowPublicId: string;
  settlementStatus: DemoFlow["order"]["status"];
  webhookDelivery: {
    status: "not_required" | "pending" | "processed" | "failed";
    retryCount: number;
  };
  truthSource: AdapterTruthSource;
};

export type PaymentProviderAdapter = {
  snapshotOrder: (input: PaymentSnapshotInput) => Promise<PaymentSnapshot> | PaymentSnapshot;
};

export type JobSnapshotInput = {
  publicId: string;
};

export type JobSnapshot = {
  environment: AdapterEnvironment;
  provider: string;
  entityStatus: "found";
  job: DemoFlow["job"];
  flowPublicId: string;
  project: DemoFlow["project"];
  truthSource: AdapterTruthSource;
};

export type JobProviderAdapter = {
  snapshotJob: (input: JobSnapshotInput) => Promise<JobSnapshot> | JobSnapshot;
};

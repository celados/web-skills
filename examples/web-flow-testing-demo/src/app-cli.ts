import { existsSync } from "node:fs";

import { cli, parseArgv } from "argc";

import { demoAuthAdapter } from "./adapters/auth.example";
import { demoJobsAdapter } from "./adapters/jobs.example";
import { demoPaymentAdapter } from "./adapters/payment.example";
import { cliOptions, schema } from "./cli-schema";
import {
  assertFlowOwner,
  assertFlowStatus,
  createRequest,
  demoScenarios,
  getFlowSnapshot,
  readState,
  resetState,
  stateFilePath,
} from "./state";

type CliContext = {
  pretty: boolean;
};

type HandlerArgs<T> = {
  input: T;
  context: CliContext;
};

type Output<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; hint?: string } };

const parsedArgv = parseArgv(process.argv.slice(2));
const app = cli(schema, {
  ...cliOptions,
  context: () => ({
    pretty: parsedArgv.flags.pretty === true,
  }),
});

try {
  await app.run({
    handlers: {
      env: {
        validate: handleEnvValidate,
        reset: handleEnvReset,
      },
      user: {
        ensure: handleUserEnsure,
        snapshot: handleUserSnapshot,
      },
      auth: {
        "api-key": {
          create: handleAuthApiKeyCreate,
          revoke: handleAuthApiKeyRevoke,
        },
      },
      payment: {
        snapshot: handlePaymentSnapshot,
      },
      jobs: {
        snapshot: handleJobsSnapshot,
      },
      flow: {
        seed: handleFlowSeed,
        snapshot: handleFlowSnapshot,
        assert: handleFlowAssert,
        "assert-owner": handleFlowAssertOwner,
      },
    },
  });
} catch (error) {
  printError(error);
  process.exitCode = 1;
}

async function handleEnvValidate(args: HandlerArgs<Record<string, never>>) {
  const state = readState();
  printSuccess(args.context, {
    environment: state.environment,
    appBaseUrl: state.appBaseUrl,
    stateFile: stateFilePath,
    stateFilePresent: existsSync(stateFilePath),
    scenarios: demoScenarios,
    userCount: Object.keys(state.users).length,
    apiKeyCount: Object.keys(state.apiKeys).length,
    requestCount: Object.keys(state.requests).length,
  });
}

async function handleEnvReset(args: HandlerArgs<{ execute?: boolean }>) {
  if (!args.input.execute) {
    printSuccess(args.context, {
      dryRun: true,
      stateFile: stateFilePath,
      action: "reset_state",
    });
    return;
  }
  const state = resetState();
  printSuccess(args.context, {
    dryRun: false,
    stateFile: stateFilePath,
    state,
  });
}

async function handleUserEnsure(args: HandlerArgs<{ email: string; name?: string; execute?: boolean }>) {
  const result = await demoAuthAdapter.ensureUser({
    email: args.input.email,
    name: args.input.name,
    execute: args.input.execute === true,
  });
  printSuccess(args.context, result);
}

async function handleUserSnapshot(args: HandlerArgs<{ email: string }>) {
  const result = await demoAuthAdapter.snapshotUser({ email: args.input.email });
  printSuccess(args.context, result);
}

async function handleAuthApiKeyCreate(
  args: HandlerArgs<{ betterAuthUserId: string; name?: string; execute?: boolean }>,
) {
  const result = await demoAuthAdapter.createApiKey({
    betterAuthUserId: args.input.betterAuthUserId,
    name: args.input.name,
    execute: args.input.execute === true,
  });
  printSuccess(args.context, result);
}

async function handleAuthApiKeyRevoke(
  args: HandlerArgs<{ keyId: string; execute?: boolean }>,
) {
  const result = await demoAuthAdapter.revokeApiKey({
    keyId: args.input.keyId,
    execute: args.input.execute === true,
  });
  if (!result) {
    throw new Error(`No demo API key found for ${args.input.keyId}.`);
  }
  printSuccess(args.context, result);
}

async function handlePaymentSnapshot(args: HandlerArgs<{ publicId: string }>) {
  const result = await demoPaymentAdapter.snapshotOrder({ publicId: args.input.publicId });
  printSuccess(args.context, result);
}

async function handleJobsSnapshot(args: HandlerArgs<{ publicId: string }>) {
  const result = await demoJobsAdapter.snapshotJob({ publicId: args.input.publicId });
  printSuccess(args.context, result);
}

async function handleFlowSeed(
  args: HandlerArgs<{ email: string; sourceUrl: string; scenario?: string; execute?: boolean }>,
) {
  if (!args.input.execute) {
    printSuccess(args.context, {
      dryRun: true,
      action: "create_request",
      email: args.input.email,
      sourceUrl: args.input.sourceUrl,
      scenario: args.input.scenario ?? "happy",
    });
    return;
  }
  printSuccess(
    args.context,
    createRequest({
      email: args.input.email,
      sourceUrl: args.input.sourceUrl,
      scenario: args.input.scenario,
    }),
  );
}

async function handleFlowSnapshot(args: HandlerArgs<{ publicId: string }>) {
  printSuccess(args.context, getFlowSnapshot(args.input.publicId));
}

async function handleFlowAssert(args: HandlerArgs<{ publicId: string; expectStatus: string }>) {
  const result = assertFlowStatus({
    publicId: args.input.publicId,
    expectStatus: args.input.expectStatus,
  });
  printSuccess(args.context, result);
  if (!result.assertion.passed) {
    process.exitCode = 2;
  }
}

async function handleFlowAssertOwner(args: HandlerArgs<{ publicId: string; email: string }>) {
  const result = assertFlowOwner({
    publicId: args.input.publicId,
    email: args.input.email,
  });
  printSuccess(args.context, result);
  if (!result.assertion.passed) {
    process.exitCode = 2;
  }
}

function printSuccess<T>(context: CliContext, data: T) {
  if (context.pretty) {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }
  printJson({
    ok: true,
    data,
  });
}

function printError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    `${JSON.stringify(
      {
        ok: false,
        error: {
          code: "DEMO_CLI_ERROR",
          message,
        },
      },
      null,
      2,
    )}\n`,
  );
}

function printJson<T>(payload: Output<T>) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

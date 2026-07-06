# Web Flow Recipes

Use these as starting recipes. Adapt the durable-state checks to the product's
business model.

## Auth Redirect

1. Start signed out.
2. Open a protected route or submit an action that requires auth.
3. Verify redirect to sign-in with a safe return path.
4. Sign in with a prepared test identity.
5. Confirm return to the intended route.
6. Verify backend identity/account snapshot if the flow creates or updates user
   state.

Pass requires correct redirect behavior and correct identity state.

## Signup Or Login

1. Decide whether the test needs a reusable account or fresh signup.
2. Prepare the identity through the project CLI or provider adapter.
3. Complete the browser signup/login path.
4. Verify session-visible account state.
5. Snapshot auth user, app account, membership, and verification flags.

If the project is invite-only in non-production, make invite/allowlist setup a
CLI precondition instead of a manual browser workaround.

## Form Submit With Pay Gate

1. Open the form route cleanly.
2. Submit one target input.
3. Capture the public request ID from URL, page, or response.
4. Wait only long enough for first evidence and normal async UI transitions.
5. Stop at the pay gate unless payment is explicitly in scope.
6. Snapshot the request and linked evidence rows.

Pass before payment usually means the request exists and is in a pending or
awaiting-settlement state that matches the UI.

## Checkout Test Mode

1. Confirm local/staging/test provider mode.
2. Use only documented test payment fixtures.
3. Complete checkout in the browser.
4. Wait for the UI to leave the payment confirmation state.
5. Snapshot order, payment/settlement attempt, entitlement, request, and job.

Use documented test payment fixtures and test-mode accounts.

## Async Job Or Workspace Flow

1. Trigger the smallest UI action that creates or changes work.
2. Capture the job/workspace/project public ID.
3. Verify the UI shows accepted, queued, running, ready, or failed.
4. Snapshot durable job state and linked output records.
5. If the job is still running, report the latest phase and progress instead of
   polling indefinitely.

Pass depends on the promise being tested. "Job accepted" and "job completed" are
different flows.

## Artifact Or Source Download

1. Sign in as an identity that should have access.
2. Navigate to the download or artifact route.
3. Verify the UI exposes the action.
4. Trigger the download only if safe and requested.
5. Snapshot artifact metadata, ownership, release/current pointer, and access
   grant.

Treat a visible button as UI evidence, then verify artifact existence and access
policy through durable state.

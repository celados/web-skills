# Provider Adapter Templates

Real projects prove web flows through the services that own durable facts:
auth providers, app databases, payment providers, webhook ledgers, queues,
object storage, and entitlement systems. Keep provider-specific API calls behind
project CLI commands so the browser flow stays user-visible and repeatable.

## Adapter Shape

Expose each adapter through non-interactive, JSON-first commands:

```bash
app-cli auth user-snapshot --email agent-smoke@example.com --env test --json
app-cli auth api-key create --better-auth-user-id user_123 --name agent-smoke --json
app-cli billing order-snapshot --public-id ord_123 --env test --json
app-cli jobs snapshot --public-id job_123 --env test --json
app-cli artifacts snapshot --public-id art_123 --env test --json
app-cli entitlements snapshot --account-id acct_123 --env test --json
```

Use a shared result envelope:

```json
{
  "ok": true,
  "data": {
    "environment": "test",
    "provider": "stripe",
    "entityStatus": "found",
    "publicId": "ord_123"
  }
}
```

The CLI should not import provider SDKs in a way that requires agent-visible
secrets. Prefer this boundary:

```text
agent -> project CLI -> profile/env preflight -> backend/operator adapter -> provider
```

For example, a Better Auth project can expose `app-cli auth api-key create`.
The command should call a backend/operator function that owns Better Auth
storage and provider secrets. The CLI receives only safe operator output such
as user ids, account ids, key ids, key starts, dry-run status, and a one-time
raw key when the command explicitly executed. Do not ask the agent to paste
provider secrets, session cookies, OAuth tokens, or database credentials into
browser steps.

## Reference Templates

The source demo includes typechecked adapter skeletons:

```text
examples/web-flow-testing-demo/src/adapters/types.ts
examples/web-flow-testing-demo/src/adapters/auth.example.ts
examples/web-flow-testing-demo/src/adapters/auth.better-auth.example.ts
examples/web-flow-testing-demo/src/adapters/payment.example.ts
examples/web-flow-testing-demo/src/adapters/jobs.example.ts
```

`auth.example.ts` is the runnable demo implementation backed by local state.
`auth.better-auth.example.ts` is the shape to copy into a real project: inject
a backend/operator boundary that resolves Better Auth users, reads app account
projections, creates API keys, and revokes API keys. The real provider calls
belong behind that boundary, not in browser automation or chat instructions.

## Auth Adapter

Auth adapters should return:

- Provider name and environment.
- Auth user id, email, email verification state, and disabled/deleted state.
- App user/account id linked to the auth identity.
- Organization or workspace memberships.
- Test-only setup actions such as verify email, seed membership, or rotate API
  key behind explicit execute flags.

Provider examples include Better Auth, Auth.js, Clerk, Auth0, Supabase Auth,
Firebase Auth, Cognito, and custom auth tables.

For Better Auth specifically:

- Resolve users by provider id or email on the backend.
- Keep app-owned account, membership, billing, and entitlement projections
  separate from Better Auth's auth tables.
- Create API keys through an operator function with an explicit `execute`
  flag. Dry-runs should return intent only.
- Store key starts/prefixes and hashed keys in the provider/backend store; show
  the raw key only once in JSON output after execute.
- Verify API requests through the app runtime, then map the Better Auth user id
  to the app account/user that owns the flow.

## Database Adapter

Database snapshots should return joined projections for the current flow:

- Request/intake row keyed by the browser-captured public id.
- Owner account/user id and source input.
- Order, job, artifact, release, and entitlement links.
- Created/updated timestamps and terminal/transient status fields.

Prefer the smallest joined projection that proves the claim over broad recent
row scans.

## Payment And Webhook Adapter

Payment adapters should return:

- Provider mode, order id, checkout session id, and payment intent or invoice id.
- Amount, currency, settlement status, and failure reason.
- Webhook event id, delivery status, retry count, and processed timestamp.
- Linked internal order/request ids.

Use provider test mode and documented test fixtures for write-path checks.

## Queue And Job Adapter

Queue/job adapters should return:

- Job id, trigger, queue name, status, phase, progress, attempt count, and last
  error.
- Linked request/account/artifact ids.
- Worker heartbeat or lease timestamps when the product uses leases.
- Output artifact or release ids when the job claims completion.

Classify queued and running states against the promise being tested: accepted,
started, or completed.

## Object Storage And Artifact Adapter

Storage adapters should return:

- Bucket/container, object key, size, content type, checksum, and updated time.
- Artifact metadata row and current release pointer.
- Access policy or signed-url eligibility for the actor.
- Linked account/workspace/project ids.

Verify both artifact existence and access policy for download flows.

## Entitlement Adapter

Entitlement adapters should return:

- Account id, plan/license/grant id, status, scope, and expiry.
- Credit ledger balance and latest debit/credit reason when credits matter.
- Source order/payment/request id that granted access.
- Feature flags that affect the browser-visible route.

Snapshot entitlements before and after checkout, unlock, license, or credit
flows.

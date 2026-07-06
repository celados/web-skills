# Provider Adapter Templates

Real projects prove web flows through the services that own durable facts:
auth providers, app databases, payment providers, webhook ledgers, queues,
object storage, and entitlement systems. Keep provider-specific API calls behind
project CLI commands so the browser flow stays user-visible and repeatable.

## Adapter Shape

Expose each adapter through non-interactive, JSON-first commands:

```bash
app-cli auth user-snapshot --email agent-smoke@example.com --env test --json
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

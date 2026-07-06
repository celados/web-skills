# Durable State Verification

Durable state is the persisted fact behind a UI claim. A web flow passes when
the browser result and durable fact agree.

## Fact Types

Classify what the flow claims changed:

| UI claim | Durable fact to verify |
|---|---|
| User signed up | Auth user plus app account exists |
| Email verified | Auth verification flag or verification event exists |
| Form submitted | Request/intake row or API envelope exists |
| Checkout paid | Order and settlement/payment attempt reached success |
| Credits consumed | Credit ledger or balance changed with a reason |
| Access unlocked | Entitlement/license/grant exists |
| Job started | Job row queued/running with the right trigger |
| Job completed | Job status plus output artifact/release exists |
| Project created | Project/workspace row exists and is owned by the actor |
| Download available | Artifact metadata and access policy agree |

## Verification Rules

- Prefer public IDs captured from the browser over time-window scans.
- Read the smallest set of rows or API resources that proves the claim.
- Include status, owner/account, source input, timestamps, and relevant linked
  records.
- Distinguish transient from terminal states. A queued job can pass when the
  flow promises only that work was accepted.
- Keep verification read-only by default. Run repair or mutation steps only
  after the user explicitly asks for them.

## Snapshot Pattern

A good snapshot command returns a joined projection:

```json
{
  "publicId": "req_123",
  "request": {
    "status": "awaiting_settlement",
    "sourceUrl": "https://example.com"
  },
  "order": {
    "status": "settled",
    "amountCents": 200,
    "currency": "usd"
  },
  "job": {
    "status": "queued",
    "phase": "waiting"
  },
  "artifact": null
}
```

Use the projection for testing and support. Keep the owning tables, APIs, or
provider records as the source of truth.

## Common Mistakes

- Treating a success toast as proof of persistence.
- Looking up the newest row instead of the row created by this run.
- Calling a backend API directly and claiming the browser flow passed.
- Ignoring account ownership when a public ID exists.
- Treating any non-terminal async state as a failure.
- Hiding backend uncertainty behind a green UI result.

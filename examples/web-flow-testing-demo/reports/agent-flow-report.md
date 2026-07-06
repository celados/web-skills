# Agent Flow Report

| Flow | Environment | Account | Public IDs | UI result | Backend result | Issues | Verdict |
|---|---|---|---|---|---|---|---|
| Submit without payment | local `http://127.0.0.1:5174` | `agent-smoke@example.com` | `req_demo_001` | Browser reached `/requests/req_demo_001`, showed `Scan complete`, and exposed `Unlock & build - $2 test mode`. | `app-cli flow snapshot --public-id req_demo_001` returned `flow.status=awaiting_payment`, `scanStatus=complete`, `order.status=none`, `job.status=not_started`, and `project.status=not_created`. | None. | Pass |
| Paid job still running | local `http://127.0.0.1:5174` | `agent-smoke@example.com` | `req_demo_002`, `ord_demo_002`, `job_demo_002` | Browser shows `Payment received`. | Snapshot returns `flow.status=running`, `order.status=settled`, `job.status=running`, `job.phase=rendering`, and `project.status=building`. | Completion is still transient. | Partial |
| Owner mismatch | local `http://127.0.0.1:5174` | `agent-smoke@example.com` | `req_demo_003` | Browser can display the public id. | `app-cli flow assert-owner --public-id req_demo_003 --email agent-smoke@example.com` exits `2`; durable owner is `owner-only@example.com`. | Actor/account mismatch blocks trust in the visible route. | Blocked |
| UI ready, backend awaiting payment | local `http://127.0.0.1:5174` | `agent-smoke@example.com` | `req_demo_004` | Browser shows `Project ready` and `Unlocked`. | `app-cli flow assert --public-id req_demo_004 --expect-status ready` exits `2`; durable status is `awaiting_payment`. | UI success conflicts with backend truth. | Blocked |
| Backend ready, UI stale | local `http://127.0.0.1:5174` | `agent-smoke@example.com` | `req_demo_005`, `proj_demo_005` | Browser still shows `Scan complete` and the pay gate. | Snapshot returns `flow.status=ready`, `order.status=settled`, `job.status=ready`, and `project.status=ready`; `ui.stale=true`. | Backend succeeded, browser needs refresh/polling diagnosis. | Partial |

## Commands Run

```bash
bun run app-cli -- env validate
bun run app-cli -- env reset --execute
bun run app-cli -- user ensure --email agent-smoke@example.com --execute
bun run app-cli -- user snapshot --email agent-smoke@example.com
bun run app-cli -- flow seed --email agent-smoke@example.com --source-url https://example.com/pricing --scenario happy --execute
bun run app-cli -- flow snapshot --public-id req_demo_001
bun run app-cli -- flow assert --public-id req_demo_001 --expect-status awaiting_payment
bun run app-cli -- flow seed --email agent-smoke@example.com --source-url https://example.com --scenario job-running --execute
bun run app-cli -- flow assert --public-id req_demo_002 --expect-status ready
bun run app-cli -- flow seed --email agent-smoke@example.com --source-url https://example.com/admin --scenario owner-mismatch --execute
bun run app-cli -- flow assert-owner --public-id req_demo_003 --email agent-smoke@example.com
bun run app-cli -- flow seed --email agent-smoke@example.com --source-url https://example.com/app --scenario ui-success-backend-failed --execute
bun run app-cli -- flow assert --public-id req_demo_004 --expect-status ready
bun run app-cli -- flow seed --email agent-smoke@example.com --source-url https://example.com/app --scenario backend-ready-ui-stale --execute
bun run app-cli -- flow assert --public-id req_demo_005 --expect-status ready
```

## Backend Evidence

```json
{
  "environment": "local",
  "entityStatus": "found",
  "flow": {
    "publicId": "req_demo_002",
    "scenario": "job-running",
    "sourceUrl": "https://example.com/",
    "accountEmail": "agent-smoke@example.com",
    "status": "running",
    "scanStatus": "complete",
    "ui": {
      "resultLabel": "Payment received",
      "gateLabel": "Payment received",
      "visibleStatus": "running",
      "stale": false
    },
    "order": {
      "publicId": "ord_demo_002",
      "status": "settled",
      "amountCents": 200,
      "currency": "usd"
    },
    "job": {
      "publicId": "job_demo_002",
      "status": "running",
      "phase": "rendering"
    },
    "project": {
      "publicId": "proj_demo_002",
      "name": "example.com rebuild",
      "status": "building"
    },
    "submitCount": 1,
    "duplicateOf": null
  }
}
```

## Notes

- Payment uses demo test mode only.
- Test identities use fake accounts controlled by the demo.
- Browser success is paired with durable snapshot/assert output before a pass.
- Partial reports name the latest durable phase instead of polling without a
  bound.
- Blocked reports name the last visible state and the exact failing assertion.

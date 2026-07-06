# Agent Flow Report

| Flow | Environment | Account | Public IDs | UI result | Backend result | Issues | Verdict |
|---|---|---|---|---|---|---|---|
| Submit without payment | local `http://127.0.0.1:5174` | `agent-smoke@example.com` | `req_demo_001` | Browser reached `/requests/req_demo_001`, showed `Scan complete`, and exposed `Unlock & build - $2 test mode`. | `app-cli flow snapshot --public-id req_demo_001` returned `flow.status=awaiting_payment`, `scanStatus=complete`, `order.status=none`, `job.status=not_started`, and `project.status=not_created`. | None. | Pass |

## Commands Run

```bash
bun run app-cli -- env validate
bun run app-cli -- env reset --execute
bun run app-cli -- user ensure --email agent-smoke@example.com --execute
bun run app-cli -- user snapshot --email agent-smoke@example.com
bun run app-cli -- flow snapshot --public-id req_demo_001
bun run app-cli -- flow assert --public-id req_demo_001 --expect-status awaiting_payment
```

## Backend Evidence

```json
{
  "environment": "local",
  "entityStatus": "found",
  "flow": {
    "publicId": "req_demo_001",
    "sourceUrl": "https://example.com/pricing",
    "accountEmail": "agent-smoke@example.com",
    "status": "awaiting_payment",
    "scanStatus": "complete",
    "order": {
      "publicId": "ord_demo_001",
      "status": "none",
      "amountCents": 200,
      "currency": "usd"
    },
    "job": {
      "publicId": "job_demo_001",
      "status": "not_started",
      "phase": "none"
    },
    "project": {
      "publicId": "proj_demo_001",
      "name": "example.com rebuild",
      "status": "not_created"
    }
  }
}
```

## Notes

- Payment was not attempted in this report.
- No real credentials, real payment methods, or production data were used.
- The browser result alone was not treated as a pass; the durable snapshot and
  assertion command completed the proof.

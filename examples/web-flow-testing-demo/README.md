# Web Flow Testing Demo

Small Vite SPA plus an agent-friendly CLI that implements the `web-flow-testing`
contract in a runnable reference app.

The browser UI and CLI share `.demo-state/state.json`. Browser actions create
the same durable facts that `app-cli flow snapshot` and `app-cli flow assert`
read later.

## Run

```bash
bun install
bun run app-cli -- env reset --execute
bun run app-cli -- user ensure --email agent-smoke@example.com --execute
bun run dev
```

Open `http://127.0.0.1:5174`.

## CLI

```bash
bun run app-cli -- env validate
bun run app-cli -- env reset --execute
bun run app-cli -- user ensure --email agent-smoke@example.com --execute
bun run app-cli -- user snapshot --email agent-smoke@example.com
bun run app-cli -- flow seed --email agent-smoke@example.com --source-url https://example.com/pricing --scenario happy --execute
bun run app-cli -- flow snapshot --public-id req_demo_001
bun run app-cli -- flow assert --public-id req_demo_001 --expect-status awaiting_payment
bun run app-cli -- flow assert-owner --public-id req_demo_001 --email agent-smoke@example.com
```

Writes are dry-run by default. Pass `--execute` to create users, reset state, or
seed a request.

## Scenarios

The default browser path is the happy submit and checkout flow. The CLI can also
seed cases that agents need to report as partial or blocked:

| Scenario | What it demonstrates |
|---|---|
| `job-running` | Payment settled, durable job still running. |
| `webhook-delayed` | Checkout accepted, provider webhook still pending. |
| `owner-mismatch` | Public id belongs to a different account. |
| `ui-success-backend-failed` | Browser looks ready, backend remains awaiting payment. |
| `backend-ready-ui-stale` | Backend is ready, browser still shows the pay gate. |
| `console-error` | Browser-visible flow plus console error evidence. |

Use `https://network-error.example/form` in the browser submit form to trigger a
controlled API error for network-failure evidence. Submit the same source URL
twice to see duplicate-submit handling through `submitCount` and `duplicateOf`
in the durable snapshot.

## Flow

1. Reset state with `app-cli env reset --execute`.
2. Ensure a test identity with `app-cli user ensure --execute`.
3. Sign in as that identity in the browser.
4. Submit `https://example.com/pricing`.
5. Copy the public id from the page or URL.
6. Run `app-cli flow snapshot --public-id <id>`.
7. Run `app-cli flow assert --public-id <id> --expect-status awaiting_payment`.
8. Click the test checkout button in the browser.
9. Run `app-cli flow assert --public-id <id> --expect-status ready`.

## Partial And Blocked Examples

```bash
bun run app-cli -- env reset --execute
bun run app-cli -- user ensure --email agent-smoke@example.com --execute
bun run app-cli -- flow seed --email agent-smoke@example.com --source-url https://example.com --scenario job-running --execute
bun run app-cli -- flow assert --public-id req_demo_001 --expect-status ready
```

That final assert exits `2` because the durable request is still `running`. For
an ownership blocker:

```bash
bun run app-cli -- flow seed --email agent-smoke@example.com --source-url https://example.com/admin --scenario owner-mismatch --execute
bun run app-cli -- flow assert-owner --public-id req_demo_002 --email agent-smoke@example.com
```

## Report

See `reports/agent-flow-report.md` for a complete sample agent report using the
skill's report format, including pass, partial, and blocked rows.

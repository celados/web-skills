# CLI Contract For Web Flow Testing

Use a CLI to make flow tests repeatable. Browser automation should exercise the
visible path, but setup and verification belong in commands that can be rerun.

## Command Families

A useful web-flow CLI usually has these families:

```text
env validate
user ensure
user verify
user snapshot
flow seed
flow snapshot
flow assert
job snapshot
artifact snapshot
```

Project names can vary. The contract matters more than the exact verbs.

## Required Properties

- Non-interactive: all input comes from flags, stdin JSON, or env vars.
- JSON-first: stdout is parseable data; diagnostics go to stderr.
- Idempotent setup: `user ensure` creates if missing and returns existing if
  already present.
- Safe writes: write actions default to dry-run and require explicit execution.
- Environment explicitness: every hosted command takes an environment/profile
  selector or proves which deployment it is using.
- Small snapshots: return the facts needed for the current flow, not a whole
  database dump.
- Stable public IDs: include user-visible public IDs and internal IDs only when
  useful for the operator.

## Example Shape

These are examples, not a required naming scheme:

```bash
app-cli env validate --env test --profile default --json
app-cli user ensure --email agent-smoke@example.com --env test --json --execute
app-cli user snapshot --email agent-smoke@example.com --env test --json
app-cli flow snapshot --public-id req_123 --env test --json
app-cli flow assert --public-id req_123 --expect-status ready --env test --json
```

For commands that mutate production, require a second gate such as
`--env prod --execute --reason "<reason>"`.

## Output Shape

Prefer this envelope:

```json
{
  "ok": true,
  "data": {
    "environment": "test",
    "dryRun": false,
    "entityStatus": "found",
    "publicId": "req_123"
  }
}
```

For failures:

```json
{
  "ok": false,
  "error": {
    "code": "AUTH_USER_NOT_FOUND",
    "message": "No test user found for email agent-smoke@example.com.",
    "hint": "Run user ensure or choose a known test identity."
  }
}
```

Helpful error messages are part of the test harness. They tell the agent exactly
what to repair next.

## What Belongs In CLI Instead Of Browser Steps

- Creating or repairing test identities.
- Marking test email verified in non-production, if the product supports it.
- Seeding credits, plans, memberships, feature flags, or entitlements.
- Reading order, job, project, artifact, webhook, or license facts.
- Replaying provider test webhooks in test mode.
- Producing a compact snapshot for the final report.

Keep user-visible interactions in the browser unless the task explicitly asks to
test only the backend/API path.

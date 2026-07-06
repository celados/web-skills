# Test Identities

Treat test users as development infrastructure. A flow test should not depend on
whatever personal account happens to be logged in.

## Lifecycle

Every project should be able to answer these operations:

```text
ensure   create or find a test identity
verify   repair auth prerequisites such as email verification
snapshot show auth user, app user/account, memberships, credits, entitlements
cleanup  disable or delete disposable identities when appropriate
```

`ensure` should be idempotent. Rerunning a smoke test should not create a new
account every time unless the flow specifically requires a fresh signup.

## Identity Types

Use the smallest identity that proves the flow:

- Reusable smoke user: stable fake email, stable password or magic-link bypass
  in non-production.
- Fresh signup user: timestamped fake email for signup and onboarding tests.
- Org/member user: belongs to a test organization or workspace.
- Paid/entitled user: has seeded credits, subscription, license, or feature flag.
- API actor: has API key, OAuth client, service token, or agent registration.

## Adapter Boundary

The skill does not mandate a provider. Implement the lifecycle through the
project's auth adapter:

- Better Auth, Auth.js, Clerk, Auth0, Supabase Auth, Firebase Auth, Cognito, or
  a custom auth table can all work.
- The adapter should expose the same operator facts: auth user id, email,
  verification status, app account id, memberships, and relevant entitlements.
- Provider-specific write paths belong in project CLI commands, not in the
  generic browser recipe.

## Safety

- Use fake domains such as `example.com` unless the product requires real email
  delivery.
- Do not ask the user to paste session cookies, magic links, OAuth tokens, or
  passwords from a personal account into chat.
- Do not use production customer accounts for write tests.
- If production inspection is necessary, read snapshots only and redact private
  data in the final report.
- For email-delivery tests, use a single operator-controlled recipient and state
  clearly whether delivery was actually sent.

## Snapshot Checklist

A useful test identity snapshot includes:

```text
environment
email
auth user id
email verification status
app user id
account id
org/workspace memberships
credits or plan state
feature flags or entitlements
API keys or service registrations, redacted
created/updated timestamps
```

Use the snapshot before the browser run when setup matters, and after the run
when the flow claims to change identity state.

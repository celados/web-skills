---
name: web-flow-testing
description: >
  Use when testing web application user flows in local, preview, staging, or
  test environments: auth redirects, signup/login, form submits, checkout test
  mode, dashboard/workspace/project flows, async job progress, entitlement
  unlocks, source/artifact downloads, or any UI path that must be proven against
  backend state. Use this before relying on screenshots alone, especially when
  the flow needs reusable test users, CLI setup, durable database/API evidence,
  or a pass/partial/blocker report.
license: MIT
---

# Web Flow Testing

## Core Idea

A web flow passes only when the browser-visible state and durable backend state
agree. The browser proves what a user could see and do. The CLI and backend
snapshots prove what the product actually persisted.

This skill is for product-development flow tests, not for replacing a full E2E
test suite. Prefer it when an agent needs to verify a real workflow quickly,
repeatably, and with enough evidence for an engineer to trust the result.

When using this repository from source, `examples/web-flow-testing-demo` is a
runnable end-to-end implementation of this contract. It contains a Vite SPA, an
`argc` CLI with `env validate`, `user ensure`, `flow snapshot`, and
`flow assert`, plus a sample agent report.

## Workflow

1. Name the flow and target environment.
   - Flow examples: sign in redirect, submit form, checkout, project creation,
     workspace edit, async job completion, entitlement unlock, source download.
   - Environment examples: local, preview, staging, test. Treat production as
     read-only unless the user explicitly asks for a production write.

2. Validate the environment before driving the UI.
   - For local work, confirm the dev server is running or start the canonical
     project command.
   - For hosted environments, run the project CLI environment/profile preflight
     when one exists.
   - Read `references/cli-contract.md` when a project has or needs a CLI surface.

3. Prepare a test identity.
   - Reuse a stable fake test account when available.
   - If missing, create or repair it through the project's supported adapter.
   - Never use personal credentials, real payment methods, or copied session
     cookies in an agent chat.
   - Read `references/test-identities.md` when auth, signup, email verification,
     API keys, org membership, or cleanup is part of the flow.

4. Drive the smallest browser path that proves the user journey.
   - When running inside Codex, prefer the Codex in-app Browser for the
     visible user flow. Use Playwright or Chrome automation only when the
     in-app Browser is not available, when repeatable local/CI smoke is needed,
     or when viewport/console checks are easier to automate.
   - Start from a clean route.
   - Capture final URL, public IDs, visible status, relevant screenshots or DOM
     evidence, and blocking console/network errors.
   - Read `references/browser-evidence.md` for browser control standards.

5. Verify durable state.
   - Prefer IDs captured from the UI or URL over broad recent-row scans.
   - Use a project CLI snapshot command when available.
   - Otherwise write the smallest read-only query or API call that proves the
     durable fact behind the UI claim.
   - Read `references/durable-state.md` when choosing the backend evidence.

6. Report pass, partial, or blocked.
   - A pass has both UI evidence and durable backend evidence.
   - A partial pass has one side proven and the other incomplete or transient.
   - A blocked result names the exact last visible state and the exact missing
     precondition, tool, account, config, or backend fact.

## Safety Defaults

- Production is read-only by default.
- Mutating CLI commands should dry-run by default and require an explicit
  `--execute`, `--confirm`, or equivalent flag.
- Payment tests use only provider test mode and documented test cards or tokens.
- Do not enter saved wallets, Link, Apple Pay, real cards, or personal account
  credentials during automated tests.
- Do not print secrets, deploy keys, env files, raw cookies, OAuth tokens, magic
  links, or full payment identifiers in the final report.

## Reference Lookup

| Situation | Read |
|---|---|
| Project has or needs CLI commands for env checks, user setup, flow snapshots, assertions | `references/cli-contract.md` |
| Flow needs test users, verified email, org/account membership, API keys, credits, entitlements, or cleanup | `references/test-identities.md` |
| You are driving Codex in-app Browser, Playwright, or Chrome and need reliable evidence instead of screenshots alone | `references/browser-evidence.md` |
| You need to decide which database/API/order/job/license/artifact facts prove the UI result | `references/durable-state.md` |
| You need recipes for auth, forms, checkout test mode, async jobs, workspaces, or downloads | `references/web-recipes.md` |

## Report Format

Use a compact table or bullets with these fields:

```text
Flow | Environment | Account | Public IDs | UI result | Backend result | Issues | Verdict
```

Always include:

- Whether payment or any other write action was attempted.
- Which test identity and test payment fixture were used, if any.
- Which backend reads and mutations were run.
- Console or network errors that affected the result.
- The final URL and public IDs needed for a developer to reproduce the check.

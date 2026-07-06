# Browser Evidence

Browser evidence proves what the user could see and do. It is necessary but not
sufficient for a pass.

## Standard Loop

1. Open a clean route for the case.
2. Confirm whether the session is signed out or signed in.
3. Interact through visible controls, not hidden implementation details.
4. Re-read the page after each navigation or render-changing action.
5. Capture final URL, visible state, public IDs, and blocking errors.
6. Stop polling after a bounded wait and report the last visible state.

## Evidence To Capture

- Final URL.
- Public IDs in the URL, page, or response payload.
- Visible status text or enabled actions.
- Key form values submitted.
- Screenshot only when visual layout or rendered content matters.
- Console errors that block the flow.
- Network failures for the route, mutation, checkout, upload, or polling calls.

Treat third-party browser warnings as noise unless they block the flow.

## Browser Control Rules

- When running inside Codex, prefer the Codex in-app Browser for the visible
  user flow. Use Playwright or Chrome automation only when the in-app Browser is
  not available, when repeatable local/CI smoke is needed, or when
  viewport/console checks are easier to automate.
- Prefer semantic selectors or accessibility snapshots over coordinates.
- Re-query elements after navigation, modal open/close, or list refresh.
- If an upload is part of the flow, set the file input directly when the tool
  supports it; avoid native OS file pickers.
- Do not fight an auth wall. Prepare the test identity or ask for the intended
  account if the project has no safe test account path.
- Do not keep polling indefinitely. Use bounded waits and then verify backend
  state to distinguish slow UI from failed persistence.

## When Screenshot Is Not Enough

A screenshot alone cannot prove:

- An order settled.
- A job was queued.
- A webhook was delivered.
- A license or entitlement was granted.
- A source artifact or project release exists.
- The user belongs to the expected account or workspace.

Use durable-state verification for those.

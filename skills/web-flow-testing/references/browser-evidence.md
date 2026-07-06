# Browser Evidence

Browser evidence proves what the user could see and do. A pass pairs browser
evidence with matching durable state.

## Standard Loop

1. Open a clean route for the case.
2. Confirm whether the session is signed out or signed in.
3. Interact through visible controls that represent the user path.
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
  user flow. Use Playwright or Chrome automation for repeatable local/CI smoke,
  viewport/console checks, or after the Browser skill bootstrap/troubleshooting
  confirms another surface is required.
- Treat the absence of direct `mcp__browser_*` tools as a prompt to inspect the
  Browser plugin entry point. The Browser plugin may expose its control surface
  through the Node REPL `js` tool and a `browser-client.mjs` bootstrap.
- If Browser is listed as a plugin or skill, read
  `browser:control-in-app-browser` before falling back. Then discover or use
  `node_repl js`, run the Browser skill's bootstrap, select
  `agent.browsers.get("iab")`, and read `browser.documentation()` before
  interacting with the tab.
- If `domSnapshot()` fails in the in-app Browser, stay on the same Browser
  surface first and use its documented alternatives such as visible DOM,
  locators, targeted page evaluation, screenshots, or browser logs. Move to
  standalone Playwright, Chrome automation, or Computer Use after the Browser
  skill's troubleshooting path confirms a different surface is required.
- Prefer semantic selectors or accessibility snapshots over coordinates.
- Re-query elements after navigation, modal open/close, or list refresh.
- If an upload is part of the flow, set the file input directly when the tool
  supports it; reserve native OS file pickers for manual testing.
- At an auth wall, prepare the test identity or ask for the intended account
  when the project needs a safe test account path.
- Use bounded waits, then verify backend state to distinguish slow UI from
  failed persistence.

## When To Add Durable State

A screenshot proves only visible UI. Add durable-state evidence for:

- An order settled.
- A job was queued.
- A webhook was delivered.
- A license or entitlement was granted.
- A source artifact or project release exists.
- The user belongs to the expected account or workspace.

Use durable-state verification for those.

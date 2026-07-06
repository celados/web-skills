# Celados Web Skills

Open agent skills for web product engineering.

This repository collects reusable Agent Skills for building, testing, and
operating web applications. The skills are opinionated playbooks extracted from
real product work, then generalized so they can apply across stacks.

## Try The Demo In 3 Minutes

The `web-flow-testing` reference app is a runnable Vite SPA plus an operator
CLI. It demonstrates the core contract: drive the browser path, capture public
IDs, and verify durable backend facts with CLI snapshots and assertions.

```bash
cd examples/web-flow-testing-demo
bun install
bun run app-cli -- env reset --execute
bun run app-cli -- user ensure --email agent-smoke@example.com --execute
bun run dev
```

Open `http://127.0.0.1:5174`, sign in as `agent-smoke@example.com`, submit
`https://example.com/pricing`, then verify the public id:

```bash
bun run app-cli -- flow snapshot --public-id req_demo_001
bun run app-cli -- flow assert --public-id req_demo_001 --expect-status awaiting_payment
```

Seed non-happy paths from the CLI when you want to see partial or blocked
reports:

```bash
bun run app-cli -- flow seed --email agent-smoke@example.com --source-url https://example.com --scenario job-running --execute
bun run app-cli -- flow seed --email agent-smoke@example.com --source-url https://example.com --scenario owner-mismatch --execute
```

## Skills

### web-flow-testing

Browser-driven web product flow testing with CLI-prepared test identities,
environment guards, durable backend verification, and concise evidence reports.

Standalone skill install:

```bash
bunx skills add celados/web-skills --skill web-flow-testing
```

Codex plugin install:

```bash
codex plugin marketplace add celados/web-skills
codex plugin add web-skills@celados-web-skills
```

Then start a new Codex thread or reload skills so Codex picks up the plugin.

Reference implementation:

```bash
cd examples/web-flow-testing-demo
bun install
bun run dev
```

The demo is a Vite SPA with an `argc`-powered `app-cli`. It shows the full idea:
create or reuse a test user, drive the browser flow, snapshot durable flow
state, assert the expected status, and write pass/partial/blocked agent
reports.

## Repository Shape

```text
marketplace.json
.agents/plugins/marketplace.json
plugins/
  web-skills/
    .codex-plugin/plugin.json
    skills/
      web-flow-testing/
examples/
  web-flow-testing-demo/
skills/
  <skill-name>/
    SKILL.md
    agents/openai.yaml
    references/
```

Future skills can cover backend business modeling, frontend feature-state
design, workflow testing, and other web product engineering practices.

When updating a standalone skill, run:

```bash
bash scripts/sync-plugin-skills.sh
```

This keeps the Codex plugin copy in `plugins/web-skills/skills/` aligned with
the standalone `skills/` source.

## License

MIT

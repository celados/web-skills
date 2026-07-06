#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

git diff --check
bash scripts/sync-plugin-skills.sh
diff -ru skills plugins/web-skills/skills
if [[ "${CI:-}" == "true" ]]; then
  git diff --exit-code -- plugins/web-skills/skills
fi
bunx skills-ref validate ./skills/web-flow-testing

plugin_validator="${PLUGIN_VALIDATOR:-/Users/deniffer/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py}"
if [[ -f "${plugin_validator}" ]]; then
  uv run --with pyyaml "${plugin_validator}" ./plugins/web-skills
else
  bun scripts/validate-plugin.mjs ./plugins/web-skills
fi

cmp -s marketplace.json .agents/plugins/marketplace.json

(
  cd examples/web-flow-testing-demo
  bun install --frozen-lockfile
  bun run build
  bun run app-cli -- env validate
)

git status --short --branch

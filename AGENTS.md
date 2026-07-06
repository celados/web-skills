# Repository Guidelines

## Purpose

This repository publishes Agent Skills for web product engineering. Keep skills
portable across projects unless a reference file explicitly says it is a
provider-specific adapter.

## Structure

- `skills/<skill-name>/SKILL.md`: required skill frontmatter and core workflow.
- `skills/<skill-name>/agents/openai.yaml`: Codex UI metadata and invocation
  policy.
- `skills/<skill-name>/references/`: detailed guidance loaded on demand.
- `skills/<skill-name>/scripts/`: optional self-contained scripts.
- `marketplace.json`: Git-backed marketplace entry for Codex plugin
  installation from GitHub.
- `.agents/plugins/marketplace.json`: repo-local marketplace entry for local
  development.
- `plugins/web-skills/`: Codex plugin package. Its `skills/` directory is a
  synced copy of the standalone `skills/` source.

## Skill Authoring Rules

- Directory name and `name` frontmatter must match and use kebab-case.
- Use folded `description: >` frontmatter focused on trigger conditions.
- Keep `SKILL.md` under 500 lines; push detailed material to `references/`.
- Every reference file mentioned in `SKILL.md` needs a clear read condition.
- Add `agents/openai.yaml` for every skill and explicitly set
  `policy.allow_implicit_invocation`.
- Do not commit `node_modules`, `dist`, `build`, generated caches, secrets, or
  product-private credentials.
- After changing `skills/`, run `bash scripts/sync-plugin-skills.sh` so the
  plugin package stays aligned.

## Validation

Before committing:

```bash
bash scripts/validate.sh
```

The validation script runs this checklist:

```bash
git diff --check
bash scripts/sync-plugin-skills.sh
diff -ru skills plugins/web-skills/skills
git diff --exit-code -- plugins/web-skills/skills # CI only
bunx skills-ref validate ./skills/web-flow-testing
uv run --with pyyaml /Users/deniffer/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py ./plugins/web-skills
cmp -s marketplace.json .agents/plugins/marketplace.json
bun run build # from examples/web-flow-testing-demo
git status --short --branch
```

If a skill includes scripts, run their `--help` output and at least one smoke
case before publishing.

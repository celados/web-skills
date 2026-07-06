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

## Skill Authoring Rules

- Directory name and `name` frontmatter must match and use kebab-case.
- Use folded `description: >` frontmatter focused on trigger conditions.
- Keep `SKILL.md` under 500 lines; push detailed material to `references/`.
- Every reference file mentioned in `SKILL.md` needs a clear read condition.
- Add `agents/openai.yaml` for every skill and explicitly set
  `policy.allow_implicit_invocation`.
- Do not commit `node_modules`, `dist`, `build`, generated caches, secrets, or
  product-private credentials.

## Validation

Before committing:

```bash
git diff --check
git status --short --branch
```

If a skill includes scripts, run their `--help` output and at least one smoke
case before publishing.

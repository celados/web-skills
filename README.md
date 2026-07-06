# Celados Web Skills

Open agent skills for web product engineering.

This repository collects reusable Agent Skills for building, testing, and
operating web applications. The skills are opinionated playbooks extracted from
real product work, then generalized so they can apply across stacks.

## Skills

### web-flow-testing

Browser-driven web product flow testing with CLI-prepared test identities,
environment guards, durable backend verification, and concise evidence reports.

Install:

```bash
bunx skills add celados/web-skills --skill web-flow-testing
```

## Repository Shape

```text
skills/
  <skill-name>/
    SKILL.md
    agents/openai.yaml
    references/
```

Future skills can cover backend business modeling, frontend feature-state
design, workflow testing, and other web product engineering practices.

## License

MIT

# Improvements Applied

This archive includes the practical improvements requested for `joo-skills`.

## Added scripts

- `scripts/joo-indexing-lookup.mjs`
  - Exact path / keyword / intent / domain lookup without reading whole map shards.
  - Supports `--json` for agent orchestration.

- `scripts/joo-indexing-diff-check.mjs`
  - PR/CI guard that checks whether route/API/state/package/domain changes likely require AI metadata updates.
  - Supports `--warn-only`, `--changed-files`, and strict exit behavior.

- `scripts/joo-navigation-benchmark.mjs`
  - Lightweight benchmark runner for representative navigation cases.
  - Uses lookup results to score first-hit quality, expected entry files, and forbidden starts.

## Added skill

- `skills/frontend-next-app-navigation/SKILL.md`
  - Next.js App Router specific navigation skill.
  - Covers route segments, server/client boundary, layouts, loading/error/not-found, and API escalation.

## Added schemas

- `schemas/navigation-benchmark-case.schema.json`
- `schemas/navigation-plan.schema.json`
- `schemas/api-contract-card.schema.json`

## Added project templates

- `.github/pull_request_template.md`
- `templates/project/.github/pull_request_template.md`
- `templates/project/.ai/indexing/benchmarks/navigation-cases.example.json`

## Updated docs and templates

- `README.md`
- `docs/skill-map.md`
- `docs/install-targets.md`
- `docs/design-principles.md`
- `templates/project/AGENTS.template.md`
- `templates/project/AI_INDEX.template.md`
- `templates/project/rules/context-navigation.md`
- `templates/project/rules/ai-navigation-maintenance.md`
- `skills/repo-indexing/commands.md`
- `skills/repo-indexing/output-contract.md`

## Updated package scripts

```bash
npm run lookup -- --keyword "order detail"
npm run diff-check
npm run diff-check:strict
npm run benchmark:navigation
```

## Validation performed

- `node --check` passed for the new scripts.
- `joo-indexing-install.mjs` was smoke-tested in a temporary target directory.
- `joo-indexing-lookup.mjs`, `joo-indexing-diff-check.mjs`, and `joo-navigation-benchmark.mjs` were smoke-tested.

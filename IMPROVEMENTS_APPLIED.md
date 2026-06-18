# Improvements Applied

## 2026-06-18 — Concern-aware navigation and benchmark rubric

### Navigation behavior

- Added task-concern decomposition: concrete behavior anchors, surface/page context, state, data, route, config, and exact-file concerns are selected separately.
- Behavior-owner files now outrank generic route/page files when the request names a label, status value, URL parameter, cache key, endpoint, or other concrete anchor.
- Import/caller/test traversal now happens only for unresolved concerns and stops once all required concerns are covered.
- Structured map hints now support `role`, `concern`/`concerns`, `anchors`, `related`, `domain`, and `confidence`.
- Fixed state detection so paths such as `apps/storefront/...` are not misclassified merely because they contain the substring `store`.

### Lookup and indexing

- Reworked `scripts/joo-indexing-lookup.mjs` to preserve full phrases alongside tokens, normalize Korean particles, detect exact paths embedded in prompts, and select a minimal concern-covering file set.
- Added `scripts/joo-indexing-lookup-self-check.mjs`, covering every token-navigation benchmark case.
- Added a generated `behavior.md` shard for badges, labels, formatters, validators, buttons, fields, toggles, mappers, and other direct behavior owners.

### Benchmark correctness

- Split benchmark expectations into `requiredGroups` and `optionalGroups` while keeping backward compatibility with `expectedGroups`.
- Corrected `storefront-shipping-status`: `ShippingStatusBadge.tsx` is required; `OrderDetailPage.tsx` is optional context.
- Separated quality and efficiency verdicts and added an exact paired McNemar check so a quality gate is not presented as statistical significance.
- Historical result directories remain immutable snapshots of the rubric used when they were generated.

### Validation

- `npm test` passes: benchmark self-check plus all 10 concern-aware lookup cases.
- All JavaScript module files pass `node --check`.
- Scanner smoke test generates and queries the new behavior shard successfully.
- Historical 60-run data was temporarily re-scored under the corrected rubric for verification only; no historical report was overwritten and no fresh Codex benchmark was run as part of this patch.

---

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

## Additional improvements applied in this revision

### Added failure-first navigation

- `skills/failure-triage/SKILL.md`
  - Converts error logs, failing tests, CI/build/type/lint/runtime failures, and stack traces into a temporary `[FAILURE_TRIAGE]` routing card.
  - Uses exact file/line/test/userland stack anchors before maps or keyword search.
  - Defines generated/large-file boundaries so agents read human-owned wrappers, mappers, hooks, configs, or tests before generated output.

- `templates/project/rules/failure-triage.md`
  - Installs the failure-first rule into target projects.
  - Keeps failure cards temporary by default.

### Added known failure pattern promotion criteria

Known failure patterns should be promoted by root cause, not error code, when any of these apply:

- same root cause appears 3+ times within 30 days
- same root cause appears 2+ times in the same sprint
- one occurrence caused significant navigation cost
- one occurrence is high severity
- the fix path is non-obvious and likely to recur

### Added stale metadata recovery

- `repo-navigation`, `context-navigation`, `AI_INDEX.template`, and metadata maintenance rules now explicitly say that source/imports/tests beat stale AI metadata.
- Agents should recover via exact lookup, import source, failing test, or targeted symbol/path search.
- Agents should update only affected metadata and avoid regenerating unrelated shards.

### Updated adapters/templates/docs

- README, skill map, design principles, indexing-shards docs
- common/Codex/Claude/OpenCode adapter fragments
- project AGENTS and AI_INDEX templates
- install script now copies `rules/failure-triage.md`
- PR template now includes stale metadata recovery and known failure pattern promotion checkboxes


## Additional hardening applied in this patch

### Safe-by-default scanner

- `joo-indexing-scan.mjs` now respects `.gitignore`, `.aiignore`/`.ignore`/`.repomixignore`, skips `.ai/`, and denies sensitive-looking paths by default.
- Added explicit opt-outs for trusted local review: `--no-respect-gitignore`, `--no-respect-ai-ignore`, and `--allow-sensitive-paths`.
- Kept `--respect-gitignore`, `--respect-ai-ignore`, and `--deny-sensitive-paths` as backward-compatible no-ops so older commands do not break.
- Updated README, install docs, package scripts, and installer next-step output to reflect the new defaults.

### Write-safety contract

- Added a pre/post edit safety contract to project templates, repo navigation skill, agent loop skill, and agent adapter fragments.
- Agents must name exact files before editing, avoid deletes/renames/moves/broad codemods unless requested, avoid generated/lock/snapshot/build/env/secret/credential/private config edits unless requested, and report verification plus metadata impact after edits.

### Anti-pattern guardrails

- Added explicit bad examples for dumb agents: no full-tree `AI_INDEX.md`, no mass `@ai-*` headers, no source edits to satisfy stale metadata, no repo-wide grep when error anchors exist, no all-shard reads, and no full OpenAPI/generated-client inspection when a narrow boundary is enough.

## Additional diff-impact workflow applied in this patch

### Added PR/diff impact skill

- `skills/pr-diff-impact/SKILL.md`
  - Starts from changed files, staged files, PR files, or explicit changed-file lists.
  - Produces `[DIFF_IMPACT]`, `[DIFF_REVIEW]`, and `[DIFF_FIX_PLAN]` flows.
  - Keeps review scope to exact changed files, direct imports, matching tests, and affected metadata shards.

- `skills/pr-diff-impact/commands.md`
  - Documents `/diff impact`, `/diff review`, and `/diff fix-plan` command behavior.

### Added diff impact script and shared classifier

- `scripts/lib/joo-path-classifier.mjs`
  - Shared route/API/state/package/domain/test/generated/metadata classification helpers.
  - Used by diff tooling to keep path classification consistent.

- `scripts/joo-diff-impact.mjs`
  - Supports `--base`, `--staged`, `--working`, `--changed-files`, `--review`, `--fix-plan`, `--include-imports`, `--no-tests`, and `--json`.
  - Reports changed file roles, map impact, coupling signals, read-next files, skipped shards, and required/maybe/skipped AI metadata targets.

- `scripts/joo-indexing-diff-check.mjs`
  - Refactored to use the shared path classifier while preserving metadata guard behavior.

### Connected diff impact to existing workflows

- Added npm scripts: `diff:impact`, `diff:impact:staged`, `diff:impact:json`, `diff:review`, and `diff:fix-plan`.
- Updated `repo-navigation`, `context-navigation`, `agent-operating-loop`, AGENTS templates, adapter fragments, README, install docs, skill map, and PR templates to use diff impact before normal router navigation when code is already changed.
- Updated metadata maintenance rules so `npm run diff:impact` / `/diff impact` gates which shards are required, maybe, or skipped before any refresh.

## Weak-agent hardening applied in this revision

### Runtime contract added to installed project guidance

- Added a short `Runtime Contract` at the top of `templates/project/AGENTS.template.md` and `templates/project/rules/context-navigation.md`.
- The contract is intentionally command-like for weak agents: exact files, diff anchors, and error anchors beat `AI_INDEX.md`; one shard before source; source/imports/tests beat metadata; no full repo scan by default; scan filenames before contents if repo-wide work is unavoidable.

### Diff command wording normalized

- Replaced ambiguous “mentally apply `/diff impact`” style wording with: run `npm run diff:impact`; if unavailable, inspect changed files directly.
- Applied this to repo navigation, agent loop, metadata maintenance, installed templates, and adapter fragments.

### Full-scan guard tightened

- Added explicit full-scan rules to `AI_INDEX.template.md`, `context-navigation.md`, repo navigation skill, and adapter fragments.
- A full scan is now treated as an exception: user-requested repo-wide work or failure of exact/diff/error/router/lookup/import navigation. Filename-only scan must happen before content reads.

### Benchmark workflow hardened

- `joo-navigation-benchmark.mjs` is now a deterministic lookup-quality check only; it does not call a model or accept estimated token metrics.
- Added a separate isolated baseline/indexed model benchmark under `benchmark/token-navigation`.
- Added native-runner benchmark routing: Antigravity uses `--runner agy`, Codex uses `--runner codex`, and neutral shells may use `--runner auto`.
- Removed mock results, manual LLM judging, historical reports, and checked-in runtime artifacts. Added Windows AGY path discovery and a Git Bash PATH repair helper.

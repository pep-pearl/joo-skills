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

## Adaptive progressive indexing added

- Added `joo-indexing-assess.mjs` and shared assessment logic.
- Added Level 0-3 activation based on static ambiguity and optional observed navigation cost.
- Added hysteresis so index levels do not oscillate at thresholds.
- `joo-indexing-scan.mjs` now defaults to `--mode auto`, emits only artifacts allowed by the selected level, and supports `force`, `off`, and explicit `--level`.
- Added local-only navigation observation recording.
- Added activation-policy self-check fixtures.
- Navigation A/B benchmark now records explicit indexing mode, recommended auto level, actual level, and forced status.
- Fixed sensitive-path matching so `token-navigation` is not mistaken for a credential path.

## Budgeted priority indexing revision

- Added `tight`, `balanced`, `retentive`, and conservative `auto` budget profiles.
- Added deterministic priority scoring using usage decay, recency, duplicate basenames, cheap file complexity, recent errors, changed files, boundary roles, and manual pins.
- Added strong penalties for legacy/archive/example/playground/generated/test/story candidates.
- Added shard-count, domain-shard, entry-count, per-shard byte, file-map byte, and total navigation-byte limits.
- Added priority-density eviction when new candidates exceed capacity.
- Added minimum residence, recent-error protection, and maximum replacement ratio to prevent index churn.
- Added optional path/domain/concern pinning with pinned overflow disabled by default.
- Added ROI observations and conservative auto-profile selection: missing evidence does not promote to retentive, repeatedly poor evidence selects tight.
- Added compact schema/config example and deterministic budget self-check.
- Changed file-map output to a flat, byte-capped format compatible with lookup.
- Removed duplicate “first read” and “full map” entry inventories.
- Made detailed file-hint Markdown and priority diagnostics opt-in.
- Separated navigation artifact bytes from maintenance-state bytes.
- Updated runtime contracts so agents never read assessment, priority, or local-usage files during normal tasks.

## Budget cache follow-up hardening

- Wired `preserveOnePerSelectedDomain` into entry selection so a selected domain shard requests at least one representative entry.
- Wired `hardBudget` and `autoShrinkOnPoorRoi` configuration flags into actual selection/profile behavior.
- Added Storybook/stories/fixture path penalties so non-production examples do not consume scarce behavior-map capacity.
- Added an integration self-check proving that repeated usage and a recent error promote `ShippingStatusBadge.tsx` into a `tight` profile without exceeding the byte budget.
- Navigation A/B reports now include the curated indexed-overlay byte size and identify its fixed-overlay budget profile.


## Verified Feedback Compound revision

- Added `skills/feedback-compound/SKILL.md`.
- Added optional `templates/project/rules/feedback-compound.md`; installer flag: `--with-feedback-compound`.
- Added compact lesson example and feedback policy/incident schemas.
- Added `docs/feedback-compound-design.md` with accepted/mitigated/deferred/skipped risk decisions.
- Added native-CLI, deterministic `benchmark/feedback-compound` baseline/skilled A/B harness.
- Updated adapters, skill map, design principles, install docs, operating loop, failure triage, and metadata lifecycle guidance.
- Kept natural-language learning advisory-only, future-task-only, environment-bound, and outside immutable safety controls.

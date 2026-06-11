# AGENTS.md

## Core

- Follow the nearest applicable `AGENTS.md`.
- Read only rules needed for the task.
- Always read `rules/context-navigation.md` before unfamiliar repo navigation.
- When work starts from an error log, failing test, CI/build/type/lint/runtime failure, or stack trace, read `rules/failure-triage.md` and create a temporary failure card before repo exploration.
- Read `AI_INDEX.md` before broad search.
- Treat `AI_INDEX.md` as a small router, not a full architecture document.
- Read at most one `.ai/indexing/maps/*` shard before source files unless the task is explicitly repo-wide. Use one companion shard only when a coupling signal exists.
- Do not load `docs/prompts/*` unless the user explicitly references one.
- Prefer small, targeted edits.
- If user names files, start there.

## Priority

Project safety rules beat AI navigation rules.

Priority order:

1. User's explicit instruction
2. Nearest project/team `AGENTS.md` or equivalent rule file
3. Security, test, generated-code, and ownership rules
4. Exact files named by the user
5. Error anchors from logs/tests/stack frames/file lines/commands, when present
6. Existing source/imports/tests
7. `AI_INDEX.md`
8. Map shards
9. Targeted search

If a navigation rule conflicts with a safety or ownership rule, follow the safety/ownership rule and mention the conflict briefly.

## Conditional Rules

Read only when relevant:

- `rules/failure-triage.md`
  - Use when an error log, failing test, CI/build/type/lint/runtime failure, or stack trace is present. Error anchors beat keyword search.
- `rules/ai-navigation-maintenance.md`
  - Use for creating, updating, auditing, or maintaining `AI_INDEX.md`, `.ai/indexing/maps/*`, `manifest.json`, sidecar file hints / optional `@ai-*` metadata, stale metadata, or promoted known failure patterns.
  - Also use after code changes that affect routes, page structure, feature boundaries, API/data flow, state, map/GIS, packages, first-read files, or map shards future agents rely on.

## Commands

- `/indexing init`: create or update project AI navigation metadata.
- `/indexing annotate`: add sidecar file hints for important files; do not modify source files by default.
- `/indexing audit`: report stale/missing AI navigation metadata.
- `/indexing refresh`: update changed metadata sections only.
- `/indexing explain`: explain how future agents should navigate this repo.
- `/failure triage`: create a temporary failure routing card from error output.
- `npm run lookup -- --keyword <term>`: lookup exact path/keyword/intent without reading whole maps.
- `npm run diff-check`: check whether source changes likely require metadata updates.
- `npm run benchmark:navigation`: measure representative navigation cases.

## Normal Navigation

Default order:

1. Exact files from the user.
2. Nearest project/team safety rules.
3. Error log or failing command, when present; use `rules/failure-triage.md`.
4. `rules/context-navigation.md`.
5. `AI_INDEX.md`.
6. Exact path/keyword lookup when the target is narrow.
7. One relevant `.ai/indexing/maps/*` shard if needed.
8. Relevant source files.
9. Imports from the first relevant source file.
10. One companion shard only when a coupling signal exists.
11. Relevant tests.
12. Targeted search only when blocked.

## After Code Changes

Check whether AI navigation metadata must change.

Update metadata when changes affect:

- routes or page entry points
- feature/domain ownership
- important flows
- state management
- API/data fetching
- map/GIS architecture
- packages or first-read files
- map shards future agents rely on
- stale metadata discovered during work
- repeated or expensive failure patterns promoted by root cause

Do not update metadata for small internal changes that do not affect repo navigation. Do not persist one-off failure triage cards.

If metadata points to missing or semantically wrong files, source/imports/tests win. Recover with exact lookup/import/test/targeted search, continue the task, and update only affected metadata when maintenance is in scope.

## Output Style

- Compact.
- Path-first.
- Mention changed, skipped, uncertain.
- Avoid full directory inventories.

# AGENTS.md

## Core

- Follow the nearest applicable `AGENTS.md`.
- Read only rules needed for the task.
- Always read `rules/context-navigation.md` before unfamiliar repo navigation.
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
5. Existing source/imports/tests
6. `AI_INDEX.md`
7. Map shards
8. Targeted search

If a navigation rule conflicts with a safety or ownership rule, follow the safety/ownership rule and mention the conflict briefly.

## Conditional Rules

Read only when relevant:

- `rules/ai-navigation-maintenance.md`
  - Use for creating, updating, auditing, or maintaining `AI_INDEX.md`, `.ai/indexing/maps/*`, `manifest.json`, or `@ai-*` metadata.
  - Also use after code changes that affect routes, page structure, feature boundaries, API/data flow, state, map/GIS, packages, or first-read files.

## Commands

- `/indexing init`: create or update project AI navigation metadata.
- `/indexing annotate`: add sparse `@ai-*` headers to important files.
- `/indexing audit`: report stale/missing AI navigation metadata.
- `/indexing refresh`: update changed metadata sections only.
- `/indexing explain`: explain how future agents should navigate this repo.

## Normal Navigation

Default order:

1. Exact files from the user.
2. Nearest project/team safety rules.
3. `rules/context-navigation.md`.
4. `AI_INDEX.md`.
5. One relevant `.ai/indexing/maps/*` shard if needed.
6. Relevant source files.
7. Imports from the first relevant source file.
8. One companion shard only when a coupling signal exists.
9. Relevant tests.
10. Targeted search only when blocked.

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

Do not update metadata for small internal changes that do not affect repo navigation.

## Output Style

- Compact.
- Path-first.
- Mention changed, skipped, uncertain.
- Avoid full directory inventories.

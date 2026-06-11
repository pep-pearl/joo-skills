# AGENTS.md

## Core

- Follow the nearest applicable `AGENTS.md`.
- Read only rules needed for the task.
- Always read `rules/context-navigation.md` before repo navigation.
- Read `AI_INDEX.md` before broad search.
- Do not load `docs/prompts/*` unless the user explicitly references one.
- Prefer small, targeted edits.
- If user names files, start there.

## Conditional Rules

Read only when relevant:

- `rules/ai-navigation-maintenance.md`
  - Use for creating, updating, auditing, or maintaining `AI_INDEX.md` or `@ai-*` metadata.
  - Also use after code changes that affect routes, page structure, feature boundaries, API/data flow, state, map/GIS, or first-read files.

## Commands

- `/indexing init`: create or update project AI navigation metadata.
- `/indexing annotate`: add sparse `@ai-*` headers to important files.
- `/indexing audit`: report stale/missing AI navigation metadata.
- `/indexing refresh`: update changed metadata sections only.
- `/indexing explain`: explain how future agents should navigate this repo.

## After Code Changes

Check whether AI navigation metadata must change.

Update metadata when changes affect:

- routes or page entry points
- feature/domain ownership
- important flows
- state management
- API/data fetching
- map/GIS architecture
- files future agents should read first

Do not update metadata for small internal changes that do not affect repo navigation.

## Output Style

- Compact.
- Path-first.
- Mention changed, skipped, uncertain.
- Avoid full directory inventories.

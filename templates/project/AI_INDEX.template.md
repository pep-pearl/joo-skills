# AI_INDEX.md

## Purpose

Small router for AI repo navigation.

Use this file to choose the smallest next context file. Do not turn it into an architecture document, file inventory, changelog, or task prompt.

## Project Shape

- name:
- stack:
- package manager:
- architecture:
- main app:

## Navigation Order

1. If the user names exact files, start there and skip broad navigation.
2. Otherwise use this file as the router.
3. Read at most one `.ai/indexing/maps/*` shard before source files.
4. Once a likely source file is found, prefer import-following over more map reading.
5. Read one companion shard only when a coupling signal exists.
6. Read relevant tests when behavior matters.
7. Use targeted search only when router, map shard, and imports are insufficient.

## Metadata Trust

This file and map shards are navigation hints, not source of truth.

Trust source/imports/tests over metadata. If source contradicts the index, source wins and the metadata should be reported as stale.

## Task Router

- route/page/screen work: `.ai/indexing/maps/routes.md`
- vague product wording: `.ai/indexing/maps/root.md`
- API/backend/query/OpenAPI work: `.ai/indexing/maps/api.md`
- state/store/cache work: `.ai/indexing/maps/state.md`
- package/build/config work: `.ai/indexing/maps/packages.md`
- domain work: `.ai/indexing/maps/domains/<domain>.md` when present

## First-Read Defaults

- app bootstrap: `TODO`
- route root: `TODO`
- API client/query root: `TODO`
- global state root: `TODO`
- test setup: `TODO`

## Cheap Escalation

Read one companion shard only when a coupling signal exists.

- route + auth/permission/session -> state/session map
- route + query/mutation/cache -> API map
- UI bug + theme/style/token/responsive -> exact imported design-system component
- form + validation/API error -> API or validation boundary
- generated client/schema mismatch -> exact operation/type boundary

Hard cap before edit: 2 map shards and 5 source files.

## Read Budget

Default budget before editing:

- maps: 0-1 files
- source files: 1-3 files
- tests: only when behavior or regression risk matters
- broad search: only after targeted navigation fails

For vague natural-language requests:

1. Read `.ai/indexing/maps/root.md`.
2. Pick one likely task/domain map.
3. Do not read all maps.
4. If the first source file is found, follow imports.

## Map Shards

Generated or candidate map shards may live under `.ai/indexing/maps/`.

They are optional navigation aids. They should be compact, path-first, and disposable. `AI_INDEX.md` remains the stable router. Prefer `confidence`, `last_verified`, and `source` metadata over long explanations.

## File-Level AI Headers

Important files may include sparse headers:

```ts
/**
 * @ai-purpose Short file responsibility.
 * @ai-domain auth/page | api | state | routing | feature | entity | shared | config | test
 * @ai-keywords Searchable aliases, route names, user-facing terms.
 */
```

Extended fields such as `@ai-entry`, `@ai-depends`, `@ai-used-by`, and `@ai-notes` are optional and should be used only when they save future reads.

## Maintenance Triggers

Update this router or map shards only when future agents would otherwise start from wrong files:

- new/removed/renamed routes or page folders
- route/page mapping changed
- major domain ownership changed
- API/data-fetching architecture changed
- state/store architecture changed
- monorepo package or entry point changed
- first-read files changed

Do not update for tiny implementation details, copy changes, formatting, generated files, or local refactors that do not change navigation.

## Output Compression

- path-first
- decision-first
- changed/skipped/uncertain only
- no full inventories unless requested
- omit unchanged sections

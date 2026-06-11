# Repo Navigation Skill

## Purpose

Choose the minimum file set needed for a development task.

This skill prevents token waste by using `AI_INDEX.md` as a small router, reading at most one map shard before source files, and then following imports.

## When To Use

Use before editing code in an unfamiliar or medium/large repository.

## Intent Classification

Classify the request before opening many files:

- `exact-file`: user named files or paths
- `route-page`: route, page, screen, URL, navigation, layout shell
- `domain`: auth, payment, map, dashboard, user, admin, etc.
- `api`: backend, Swagger/OpenAPI, query, mutation, client, endpoint
- `state`: store, cache, atom, Redux/Zustand/Jotai/Recoil, session state
- `config`: package, build, workspace, lint, test setup
- `vague-product`: natural-language product/design/planning wording with no code term
- `cross-cutting`: repo-wide audit, migration, naming, dependency change

## Read Algorithm

1. If user provides exact files, start there.
2. Otherwise read `rules/context-navigation.md` if present.
3. Read `AI_INDEX.md` if present.
4. Pick one likely map shard only when needed:
   - route/page/screen: `.ai/indexing/maps/routes.md`
   - vague natural language: `.ai/indexing/maps/root.md`
   - API/backend/query: `.ai/indexing/maps/api.md`
   - state/store/cache: `.ai/indexing/maps/state.md`
   - package/build/config: `.ai/indexing/maps/packages.md`
   - domain-specific: `.ai/indexing/maps/domains/<domain>.md`
5. Identify:
   - domain
   - entry point
   - likely route/page
   - state/API dependencies
   - relevant tests
6. Read the first likely source file.
7. Follow imports downward.
8. Prefer targeted search over directory scans.
9. Broader search only if:
   - index is missing
   - index is stale
   - import-following is blocked
   - task truly requires cross-repo audit

## Read Budget

Default budget before editing:

- map shards: 0-1
- source files: 1-3
- tests: only when behavior matters
- broad search: only after targeted navigation fails

For vague product requests:

1. Read `AI_INDEX.md`.
2. Read `.ai/indexing/maps/root.md` if present.
3. Choose one likely route/domain/task map.
4. Do not read all map shards.
5. Once a source entry is found, imports beat more maps.

## Stop Rule

After one map and three source files, decide one of:

- enough context to edit
- follow one import chain
- run targeted search
- report stale/missing metadata
- ask only if the task is blocked by real ambiguity

## Output

```txt
Read:
- path: reason

Next:
- path: reason

Skipped:
- broad scan: why unnecessary

Uncertain:
- ...
```

## Principles

- Exact files beat index.
- Index beats search.
- One map shard beats directory browsing.
- Imports beat reading more maps after a source file is found.
- Tests are read when behavior matters.
- Never read generated or huge files unless needed.

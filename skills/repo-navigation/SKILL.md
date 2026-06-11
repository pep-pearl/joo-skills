# Repo Navigation Skill

## Purpose

Choose the minimum file set needed for a development task.

This skill prevents token waste by using `AI_INDEX.md` as a small router, reading at most one map shard before source files, and then following imports.

## When To Use

Use before editing code in an unfamiliar or medium/large repository.

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

## Metadata Trust Rule

Treat `AI_INDEX.md`, map shards, and `@ai-*` headers as navigation hints, not truth.

Trust order for technical facts:

1. source/imports/tests
2. project rules
3. `AI_INDEX.md`
4. map shards
5. generated candidates

If source/imports contradict metadata, source wins.

If metadata confidence is `low`, `generated-only`, or absent, verify with one source file before editing.

Report stale metadata instead of forcing the index to fit.

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
2. Otherwise read nearest project/team rules if present.
3. Read `rules/context-navigation.md` if present.
4. Read `AI_INDEX.md` if present.
5. Pick one likely map shard only when needed:
   - route/page/screen: `.ai/indexing/maps/routes.md`
   - vague natural language: `.ai/indexing/maps/root.md`
   - API/backend/query: `.ai/indexing/maps/api.md`
   - state/store/cache: `.ai/indexing/maps/state.md`
   - package/build/config: `.ai/indexing/maps/packages.md`
   - domain-specific: `.ai/indexing/maps/domains/<domain>.md`
6. Identify:
   - domain
   - entry point
   - likely route/page
   - state/API dependencies
   - relevant tests
7. Read the first likely source file.
8. Follow imports downward.
9. Prefer targeted search over directory scans.
10. Broader search only if:
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

## Cheap Escalation Rule

Default to one map shard. Escalate by one companion shard only when the current task contains a coupling signal.

Coupling signals:

- route + auth/permission/session
- route + query/mutation/cache
- UI bug + theme/style/token/responsive
- form + validation/API error
- disabled/loading/error state
- stale data/cache/invalidation
- feature flag/experiment
- i18n/date/timezone/locale
- generated client/schema mismatch

Companion shard choices:

- route/page + data issue -> also read `maps/api.md`
- route/page + session/permission issue -> also read `maps/state.md`
- API task + visible page behavior -> also read `maps/routes.md`
- UI task + shared design-system signal -> targeted search for the imported design-system component only
- package/config task + runtime failure -> also read exact failing package/config file

Hard cap before edit:

- map shards: 2
- source files: 5
- broad search only after exact file, index route, and import-following fail

Output must explain escalation:

```txt
Escalated:
- `.ai/indexing/maps/api.md`: page bug depends on query cache

Skipped:
- broad search: imports provided enough context
```

## Stop Rule

After one map and three source files, decide one of:

- enough context to edit
- follow one import chain
- cheap-escalate to one companion shard because a coupling signal exists
- run targeted search
- report stale/missing metadata
- ask only if the task is blocked by real ambiguity

## Output

```txt
Read:
- path: reason

Escalated:
- path: reason, if used

Next:
- path: reason

Skipped:
- broad scan: why unnecessary

Uncertain:
- ...
```

## Principles

- Exact files beat index.
- Safety and ownership rules beat index.
- Source/imports/tests beat metadata.
- Index beats search.
- One map shard beats directory browsing.
- One companion shard is allowed only for coupling signals.
- Imports beat reading more maps after a source file is found.
- Tests are read when behavior matters.
- Never read generated or huge files unless needed.

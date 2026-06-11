# Context Navigation Rule

## Purpose

Minimize token use during normal development tasks.

Use this rule to choose the smallest useful read set. Do not use it to create or update AI navigation metadata unless the user asked for indexing/maintenance.

## Priority

Project safety rules beat AI navigation rules.

Priority order:

1. User's explicit instruction
2. Nearest project/team `AGENTS.md` or equivalent rule file
3. Security, test, generated-code, and ownership rules
4. Exact files named by the user
5. Existing source/imports/tests
6. `/AI_INDEX.md`
7. `.ai/indexing/maps/*`
8. Targeted search

If a navigation rule conflicts with a safety or ownership rule, follow the safety/ownership rule and mention the conflict briefly.

## Metadata Trust Rule

`/AI_INDEX.md`, map shards, sidecar file hints, and optional source-header exceptions are navigation hints, not source of truth.

Trust source/imports/tests over metadata.

If metadata confidence is `low`, `generated-only`, or absent, verify with one source file before editing.

If source/imports contradict metadata, source wins. Report stale metadata instead of forcing the index to fit.

## Intent Classification

Before reading many files, classify the request:

- `exact-file`: user named files or paths
- `route-page`: route, page, screen, URL, navigation, layout shell
- `domain`: auth, payment, map, dashboard, user, admin, etc.
- `api`: backend, Swagger/OpenAPI, query, mutation, client, endpoint
- `state`: store, cache, atom, Redux/Zustand/Jotai/Recoil, session state
- `config`: package, build, workspace, lint, test setup
- `vague-product`: natural-language product/design/planning wording with no code term
- `cross-cutting`: repo-wide audit, migration, naming, dependency change

## Read Order

1. User-provided exact files.
2. Nearest project/team safety rules.
3. `/AI_INDEX.md` as the router.
4. Exact path/keyword lookup when the target is narrow.
5. At most one relevant `.ai/indexing/maps/*` shard.
6. Sidecar file hint for exact path when needed.
7. Relevant source files.
8. Imports from the first relevant source file.
9. One companion shard only when a coupling signal exists.
10. Relevant tests.
11. Targeted search only when router/lookup/map/import navigation fails.

## Read Budget

Default before editing:

- map shards: 0-1
- source files: 1-3
- tests: only when behavior matters
- broad search: no, unless blocked

For vague product requests:

1. Read `/AI_INDEX.md`.
2. Read `.ai/indexing/maps/root.md` if present.
3. Choose one likely task/domain map.
4. Do not read every map.
5. Once a likely source file is found, follow imports instead of reading more maps.

For cross-cutting work:

- Use root/package maps plus targeted search.
- Avoid full scans unless the task truly requires repo-wide analysis.

## Cheap Escalation Rule

Escalate by one companion shard only when the task contains a coupling signal.

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

## Navigation Rules

- Exact files beat index.
- Safety and ownership rules beat index.
- Source/imports/tests beat metadata.
- `AI_INDEX.md` beats broad search.
- Exact path/keyword lookup beats reading whole map shards.
- One map shard beats directory browsing.
- One companion shard is allowed only for coupling signals.
- Imports beat reading more maps after a source entry is found.
- Tests are read when behavior or regression risk matters.
- Never read generated, lock, snapshot, build, or huge files unless directly needed.

## Missing / Stale Index

If `/AI_INDEX.md` or map shards are missing or stale:

1. Mention it briefly.
2. Continue with the smallest targeted search possible.
3. Do not create or update metadata unless the user asked for it.
4. At the end, report whether AI navigation metadata appears stale.

## Output Style

When reporting navigation work:

- Keep it short.
- Mention only files read, escalation reason, next target, and uncertainty.
- Avoid full directory inventories.
- Prefer path-first bullets.
- Do not restate unchanged index content.


## Exact Path Lookup Rule

When the user names an exact source file, open that file first. If the task is not trivial, lookup only that exact path in `.ai/indexing/file-map.candidate.json` or the relevant map shard. Do not read a whole map for one known path.

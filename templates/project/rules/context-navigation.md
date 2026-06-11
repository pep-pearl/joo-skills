# Context Navigation Rule

## Purpose

Minimize token use during normal development tasks.

Use this rule to choose the smallest useful read set. Do not use it to create or update AI navigation metadata unless the user asked for indexing/maintenance.

If the task starts from an error log, failing test, CI/build failure, stack trace, or type/lint/runtime error, use `rules/failure-triage.md` first. Error anchors beat normal index routing.

## Priority

Project safety rules beat AI navigation rules.

Priority order:

1. User's explicit instruction
2. Nearest project/team `AGENTS.md` or equivalent rule file
3. Security, test, generated-code, and ownership rules
4. Exact files named by the user
5. Error anchors from logs/tests/stack frames/file lines/commands, when present
6. Existing source/imports/tests
7. `/AI_INDEX.md`
8. `.ai/indexing/maps/*`
9. Targeted search

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
- `failure`: error log, stack trace, failing test, CI/build/type-check/lint/runtime failure

## Read Order

1. User-provided exact files.
2. Nearest project/team safety rules.
3. Error log or failing command, when present. Create a temporary `[FAILURE_TRIAGE]` card before source reads.
4. `/AI_INDEX.md` as the router.
5. Exact path/keyword lookup when the target is narrow.
6. At most one relevant `.ai/indexing/maps/*` shard.
7. Sidecar file hint for exact path when needed.
8. Relevant source files.
9. Imports from the first relevant source file.
10. One companion shard only when a coupling signal exists.
11. Relevant tests.
12. Targeted search only when router/lookup/map/import navigation fails.


## Failure-First Navigation

When a failure log exists, normal navigation is secondary.

```txt
error log / failing command
-> exact file/line/test/stack anchor
-> topmost userland frame
-> source around the anchor
-> direct import/props/caller/mapper/test setup
-> AI_INDEX.md or one map shard only if anchors are missing or stale
-> targeted search only when anchored paths fail
```

Do not start with broad or keyword search when a reliable failure anchor exists. Generated files are never first-read files; read the human-owned wrapper, mapper, hook, config, or test boundary first.

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

## Write Safety Contract

Before editing source files:

- Name the exact files you intend to edit.
- Do not delete, rename, or move files unless the user explicitly requested it.
- Do not edit generated files, lockfiles, snapshots, build outputs, `.env*`, secret files, credential files, or private config unless explicitly requested.
- Do not run repo-wide replace or broad codemods unless the user asked for a repo-wide change and the matched files were reviewed.
- If AI metadata conflicts with source code, source/imports/tests win. Do not change runtime logic to match stale metadata.
- Prefer the smallest behavior-preserving change.

After editing:

- List changed files.
- State what was verified.
- State tests/checks run, or why they were skipped.
- State whether `AI_INDEX.md` or map shards need updates.

## Agent Anti-Patterns

Avoid these failure modes:

- Replacing `AI_INDEX.md` with a full file tree.
- Adding `@ai-*` headers to every source file.
- Editing source code because a generated map says the file has a role.
- Starting with repo-wide grep when an exact file, line, test, or stack anchor exists.
- Reading every map shard before opening source.
- Inspecting full OpenAPI/Swagger output when one endpoint or operation is relevant.
- Touching generated clients unless the exact operation/type boundary requires it.
- Reformatting unrelated code while fixing a navigation or metadata issue.

## Navigation Rules

- Exact files beat index.
- Safety and ownership rules beat index.
- Source/imports/tests beat metadata.
- Error anchors beat `AI_INDEX.md` when a failure is present.
- `AI_INDEX.md` beats broad search.
- Exact path/keyword lookup beats reading whole map shards.
- One map shard beats directory browsing.
- One companion shard is allowed only for coupling signals.
- Imports beat reading more maps after a source entry is found.
- Tests are read when behavior or regression risk matters.
- Never read generated, lock, snapshot, build, or huge files unless directly needed.

## Stale Metadata Recovery

When metadata points to a missing, renamed, moved, or semantically wrong file:

1. Do not force source changes to match metadata.
2. Mark the metadata entry as stale.
3. Recover with the cheapest path: exact lookup, direct import source, nearest route/config/test source, or targeted symbol/path search.
4. Continue using source/imports/tests as truth.
5. At the end, report whether affected metadata should be updated.

Do not regenerate unrelated shards during normal development.

## Missing / Stale Index

If `/AI_INDEX.md` or map shards are missing or stale:

1. Mention it briefly.
2. Continue with the smallest targeted search possible.
3. Do not create or update metadata unless the user asked for it or metadata maintenance is in scope.
4. At the end, report whether AI navigation metadata appears stale and which affected shard/rule should be updated.

## Output Style

When reporting navigation work:

- Keep it short.
- Mention only files read, escalation reason, next target, and uncertainty.
- Avoid full directory inventories.
- Prefer path-first bullets.
- Do not restate unchanged index content.


## Exact Path Lookup Rule

When the user names an exact source file, open that file first. If the task is not trivial, lookup only that exact path in `.ai/indexing/file-map.candidate.json` or the relevant map shard. Do not read a whole map for one known path.

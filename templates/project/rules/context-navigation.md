# Context Navigation Rule

## Runtime Contract — read this first

These rules are intentionally short for weak agents. Follow them before any longer guidance.

1. If the user names exact files, open those files first and do not read maps yet.
2. If code is already changed, run `npm run diff:impact` first. If it fails, inspect the changed files directly. Do not start from `AI_INDEX.md`.
3. If an error log, failing test, stack trace, CI/build/type/lint/runtime failure exists, use the file/line/test/userland stack anchor first. Do not start with keyword search.
4. Read `AI_INDEX.md` before broad search only when there is no stronger exact/diff/error anchor.
5. Read at most one map shard before source files. Use a second shard only for an explicit coupling signal.
6. After a likely source file is found, follow imports/callers/tests instead of reading more maps.
7. Treat `AI_INDEX.md`, map shards, and file hints as navigation hints, never as truth.
8. Source/imports/tests beat AI metadata. Never change runtime code to satisfy stale metadata.
9. Do not edit generated, lock, snapshot, build output, `.env*`, secret, credential, or private config files unless explicitly requested.
10. Do not delete, rename, move, repo-wide replace, or broad-codemod unless explicitly requested.
11. Before editing source, name the exact files to change.
12. After editing, list changed files, verification, skipped checks, and whether AI metadata changed.
13. Full repo scans are forbidden by default. If truly needed, scan filenames first, not file contents.
14. Do not read all map shards, full Swagger/OpenAPI dumps, generated clients, or full route trees unless the user explicitly asks.
15. When blocked, run targeted lookup/search by exact path, symbol, route, endpoint, or domain alias.

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
5. Changed files from diff/PR/staged, when present
6. Error anchors from logs/tests/stack frames/file lines/commands, when present
7. Existing source/imports/tests
8. `/AI_INDEX.md`
9. `.ai/indexing/maps/*`
10. Targeted search

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
2. Changed files, staged files, or PR file lists. Run `npm run diff:impact` before normal router navigation. If the script is unavailable, inspect changed files directly.
3. Nearest project/team safety rules.
4. Error log or failing command, when present. Create a temporary `[FAILURE_TRIAGE]` card before source reads.
5. `/AI_INDEX.md` as the router.
6. Exact path/keyword lookup when the target is narrow.
7. At most one relevant `.ai/indexing/maps/*` shard.
8. Sidecar file hint for exact path when needed.
9. Relevant source files.
10. Imports from the first relevant source file.
11. One companion shard only when a coupling signal exists.
12. Relevant tests.
13. Targeted search only when router/lookup/map/import navigation fails.



## Diff Navigation

When code is already changed, run `npm run diff:impact` before normal router navigation. If unavailable, inspect changed files directly. Diff anchors beat `AI_INDEX.md` routing.

Use this order:

```txt
changed files / staged files / PR files
-> exact changed files
-> changed hunks or local source around the changes
-> direct imports only when the changed code crosses a boundary
-> matching tests only when behavior/regression risk matters
-> one affected map shard only if metadata impact must be decided
-> targeted search only when changed anchors fail
```

Recommended commands:

```bash
node scripts/joo-diff-impact.mjs --target . --base main
node scripts/joo-diff-impact.mjs --target . --staged
node scripts/joo-diff-impact.mjs --target . --base main --review --include-imports
node scripts/joo-diff-impact.mjs --target . --base main --fix-plan --include-imports
```

Do not read full root/routes/API/domain shards just because a PR exists. Use the diff result to mark AI metadata as required, maybe, or skipped.

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
- Avoid full scans unless the task truly requires repo-wide analysis; if unavoidable, scan filenames before contents.

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

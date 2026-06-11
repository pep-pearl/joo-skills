# Repo Navigation Skill

## Purpose

Choose the minimum file set needed for a development task.

This skill prevents token waste by using `AI_INDEX.md` as a small router, reading at most one map shard before source files, and then following imports.

## When To Use

Use before editing code in an unfamiliar or medium/large repository.

If the task starts from an error message, failing test, stack trace, CI log, type-check failure, or build failure, use `failure-triage` first. Error anchors beat normal repo navigation.

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
8. `AI_INDEX.md`
9. Map shards
10. Targeted search

If a navigation rule conflicts with a safety or ownership rule, follow the safety/ownership rule and mention the conflict briefly.

## Metadata Trust Rule

Treat `AI_INDEX.md`, map shards, sidecar file hints, and optional source-header exceptions as navigation hints, not truth.

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
- `failure`: error log, stack trace, failing test, CI/build/type-check/lint/runtime failure

## Read Algorithm

1. If user provides exact files, record them as first anchors.
2. If changed files, staged files, or PR file lists are available, run or mentally apply `/diff impact` and use changed files as first anchors.
3. Read nearest project/team rules if present.
4. If the user provides error output or a failing command, create a temporary `[FAILURE_TRIAGE]` card before source reads and read from error anchors. Do not start with keyword search.
5. Read `rules/context-navigation.md` if present.
6. Read `AI_INDEX.md` if present.
7. Pick one likely map shard only when needed:
   - route/page/screen: `.ai/indexing/maps/routes.md`
   - vague natural language: `.ai/indexing/maps/root.md`
   - API/backend/query: `.ai/indexing/maps/api.md`
   - state/store/cache: `.ai/indexing/maps/state.md`
   - package/build/config: `.ai/indexing/maps/packages.md`
   - domain-specific: `.ai/indexing/maps/domains/<domain>.md`
8. Identify:
   - domain
   - entry point
   - likely route/page
   - state/API dependencies
   - relevant tests
9. Read the first likely source file.
10. Follow imports downward.
11. Prefer targeted search over directory scans.
12. Broader search only if:
   - index is missing
   - index is stale
   - import-following is blocked
   - task truly requires cross-repo audit


## Diff Navigation

When code is already changed, use `pr-diff-impact` before normal router navigation. Diff anchors beat `AI_INDEX.md` routing.

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

## Failure Navigation

When an error log exists, normal index routing is secondary.

Use this order:

```txt
error log / failing command
-> exact file/line/test/stack anchor
-> topmost userland frame
-> source around the anchor
-> direct import/props/caller/mapper/test setup
-> AI_INDEX.md or one map shard only if anchors are missing or stale
-> targeted search only when anchored paths fail
```

Before reading repo files, produce a temporary `[FAILURE_TRIAGE]` card with failure type, anchors, primary read, follow-only-if-needed files, files not to read yet, likely cause, and verification command.

Do not persist every failure. Promote only repeated or expensive root-cause patterns, not error codes. Suggested promotion threshold: same root cause 3+ times within 30 days, 2+ times in the same sprint, one high-navigation-cost occurrence, or one high-severity occurrence.

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


## Stale Metadata Recovery

When metadata points to a missing, renamed, moved, or semantically wrong file:

1. Do not force the source to match metadata.
2. Mark the metadata entry as stale.
3. Recover with the cheapest path:
   - exact path lookup
   - direct import source
   - nearest route/config/test source
   - targeted search by exported symbol
   - targeted search by route/path/domain alias
4. Continue the user task using source/imports/tests as truth.
5. After the code task, update only the affected metadata when metadata maintenance is in scope.
6. Do not regenerate unrelated map shards.

Recommended final note:

```txt
AI navigation metadata:
- stale detected: yes/no
- stale source: ...
- contradiction: ...
- updated: ...
- skipped: unrelated shards
```

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
- Error anchors beat index when a failure is present.
- Index beats search.
- One map shard beats directory browsing.
- One companion shard is allowed only for coupling signals.
- Imports beat reading more maps after a source file is found.
- Tests are read when behavior matters.
- Never read generated or huge files unless needed.
- Do not force code to match stale metadata.


## Exact Path Lookup Rule

When the user names an exact source file, open that file first. If the task is not trivial, lookup only that exact path in `.ai/indexing/file-map.candidate.json` or the relevant map shard. Do not read a whole map for one known path.

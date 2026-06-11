# AGENTS.md

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

## Core

- Follow the nearest applicable `AGENTS.md`.
- Read only rules needed for the task.
- Read `rules/context-navigation.md` only when the runtime contract and `AI_INDEX.md` are not enough for unfamiliar or cross-cutting navigation.
- When work starts from an error log, failing test, CI/build/type/lint/runtime failure, or stack trace, read `rules/failure-triage.md` and create a temporary failure card before repo exploration.
- Read `AI_INDEX.md` before broad search.
- Treat `AI_INDEX.md` as a small router, not a full architecture document.
- Read at most one `.ai/indexing/maps/*` shard before source files unless the task is explicitly repo-wide. Use one companion shard only when a coupling signal exists.
- Do not load `docs/prompts/*` unless the user explicitly references one.
- Prefer small, targeted edits.
- If user names files, start there.
- If code is already changed, run `npm run diff:impact` first; if unavailable, inspect changed files directly before normal `AI_INDEX.md` routing.

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
- `/diff impact` / `npm run diff:impact`: classify changed files and choose read-next/skip/metadata targets.
- `/diff review`: review changed files, direct imports, and matching tests only.
- `/diff fix-plan`: plan the smallest fix path for an existing diff.
- `npm run lookup -- --keyword <term>`: lookup exact path/keyword/intent without reading whole maps.
- `npm run diff:impact`: inspect changed files before normal router navigation.
- `npm run diff-check`: check whether source changes likely require metadata updates.
- `npm run benchmark:navigation`: measure representative navigation cases.

## Normal Navigation

Default order:

1. Exact files from the user.
2. Changed files from PR/diff/staged files, using `npm run diff:impact` when available.
3. Nearest project/team safety rules.
4. Error log or failing command, when present; use `rules/failure-triage.md`.
5. `rules/context-navigation.md`.
6. `AI_INDEX.md`.
7. Exact path/keyword lookup when the target is narrow.
8. One relevant `.ai/indexing/maps/*` shard if needed.
9. Relevant source files.
10. Imports from the first relevant source file.
11. One companion shard only when a coupling signal exists.
12. Relevant tests.
13. Targeted search only when blocked.

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

## After Code Changes

Check whether AI navigation metadata must change. If a diff exists, run `npm run diff:impact` first and update only required/maybe metadata targets. If unavailable, inspect changed files directly.

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

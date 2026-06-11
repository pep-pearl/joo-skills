# PR Diff Impact Skill

## Purpose

Review already-changed code from `git diff`, PR changed files, staged files, or an explicit changed-file list.

This skill starts from changed files instead of normal `AI_INDEX.md` routing. It decides the smallest useful read set, likely affected boundaries, targeted tests, and AI metadata shards that may need maintenance.

## Use When

- `/diff impact`
- `/diff review`
- `/diff fix-plan`
- user asks to review an existing PR/diff
- staged or working-tree changes need targeted impact analysis
- code was already changed and the agent must avoid re-reading the whole repo
- AI metadata maintenance should be scoped to changed files only

## Do Not Use For

- brand-new feature discovery with no changed files
- full repository audits
- initial indexing; use `repo-indexing`
- failures that start from logs, stack traces, or failing commands; use `failure-triage` first
- generated-file review unless the generated boundary itself is the task

## Trust Rule

Changed source/imports/tests beat AI metadata.

`AI_INDEX.md`, map shards, sidecar file hints, and generated candidates are hints. If diff evidence contradicts metadata, continue from changed source/imports/tests and report the smallest stale metadata target.

## Diff Source Priority

1. User-provided changed file list
2. PR changed files
3. Staged files
4. Base diff, usually `main...HEAD`
5. Working tree diff

When multiple sources are available, use the most explicit one. Do not fall back to broad repo navigation until changed anchors are insufficient.

## Commands

### `/diff impact`

Goal:

- classify changed files
- identify affected route/API/state/package/domain boundaries
- recommend exact next reads
- identify matching tests when obvious
- decide required/maybe/skipped AI metadata targets

Preferred script:

```bash
node scripts/joo-diff-impact.mjs --target . --base main
```

For staged local review:

```bash
node scripts/joo-diff-impact.mjs --target . --staged
```

For CI or PR integrations that already have a file list:

```bash
node scripts/joo-diff-impact.mjs --target . --changed-files "src/pages/a.tsx,src/api/client.ts"
```

### `/diff review`

Goal:

- review changed behavior only
- read changed files, direct imports, and matching tests
- avoid unrelated shards and generated files
- flag stale metadata only as a side effect

Preferred script:

```bash
node scripts/joo-diff-impact.mjs --target . --base main --review --include-imports
```

### `/diff fix-plan`

Goal:

- produce a minimal repair plan for the existing diff
- name patch targets and verification commands
- do not edit files unless the user also asked for implementation
- decide whether AI metadata is unchanged, required, or maybe

Preferred script:

```bash
node scripts/joo-diff-impact.mjs --target . --base main --fix-plan --include-imports
```

## Read Algorithm

1. Get changed files from the strongest available diff source.
2. Classify each changed path:
   - `routes`
   - `api`
   - `state`
   - `packages`
   - `domain:<name>`
   - `first-read`
   - `test`
   - `generated`
   - `metadata`
3. Treat exact changed files as first anchors.
4. Read changed files around changed hunks before opening map shards.
5. Follow direct imports only when the changed file crosses a boundary.
6. Read matching tests only when behavior or regression risk matters.
7. Use at most one companion shard when a coupling signal exists.
8. Route AI metadata maintenance only to required/maybe shards.
9. Skip full route/API/root/domain shard reads unless anchors are missing or stale.

## Coupling Signals

Escalate narrowly when the diff shows:

- route/page + API/query/cache
- route/page + state/session/permission
- API/query + visible page behavior
- API/query + behavior tests
- package/build/test config + source behavior
- generated client/schema mismatch with a human-owned wrapper
- domain rename/move or first-read file move

## Read Budget

Default before review or fix planning:

- changed files: all human-owned changed files, unless too many
- direct imports: only with `--include-imports` or when changed anchors are insufficient
- tests: matching or changed tests only
- map shards: 0 by default, 1 companion only for coupling
- broad search: no, unless changed paths/imports do not resolve

Hard cap before deciding:

- map shards: 1, plus one companion only with a coupling signal
- source/import files: 5 after changed files
- test files: 3 likely matches
- broad search: only after exact changed files and imports fail

## Output

```txt
[DIFF_IMPACT]
Source:
- mode: staged | base | changed-files | pr
- base: main
- changed files: n

Changed:
- `path`: role; classes; domain

Impact:
- route map: none | maybe | affected
- api map: none | maybe | affected
- state map: none | maybe | affected
- packages map: none | maybe | affected
- domain maps: ...
- tests: ...
- coupling: ...

Read next:
- exact changed files
- direct imports, if needed
- matching tests

Skip:
- full root map
- unrelated map shards
- generated files unless task requires them

AI metadata:
- required: ...
- maybe: ...
- skip: ...
```

## Metadata Maintenance Gate

Use this skill before `ai-metadata-maintenance` when a code diff already exists.

Rules:

- If `/diff impact` says a shard is `required`, update only that shard after source review.
- If it says `maybe`, inspect changed source/imports/tests before touching metadata.
- If it says `skip`, do not read or regenerate that shard.
- `AI_INDEX.md` changes are required only for changed first-read files, router semantics, or domain entry ownership.
- Do not refresh every map shard for a local diff.

## Review Output

```txt
[DIFF_REVIEW]
Changed:
- ...

Review focus:
- changed behavior
- imports/types around changed hunks
- targeted tests
- stale metadata risk, if any

Do not review yet:
- unrelated shards
- full OpenAPI/Swagger output
- generated clients unless directly changed
```

## Fix Plan Output

```txt
[DIFF_FIX_PLAN]
Problem hypothesis:
- ...

Minimal fix path:
1. Read changed file around hunk.
2. Follow direct import only if boundary changed.
3. Patch smallest source/test set.
4. Update only required/maybe AI metadata.

Verification:
- targeted test or type/lint command

AI metadata:
- unchanged because ... | required ... | maybe ...
```

## Principles

- Diff anchors beat normal router navigation.
- Exact changed files beat `AI_INDEX.md`.
- Source/imports/tests beat metadata.
- Metadata maintenance should follow diff impact, not full refresh.
- Generated files are not first-read files unless the task is explicitly about the generated boundary.
- Prefer reviewing changed hunks and direct imports over reading every shard.
- Be explicit about what was skipped.

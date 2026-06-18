# AI_INDEX.md

## Runtime Contract — weak-agent safe

1. Exact files, changed files, and error anchors beat this router.
2. Read this file only to choose the smallest next context file.
3. Read at most one map shard before source; use a second shard only for a coupling signal.
4. After source is found, follow imports/callers/tests instead of more maps.
5. Metadata is a hint. Source/imports/tests are truth.
6. Never edit runtime code to match stale metadata.
7. Full repo scans are forbidden by default; if unavoidable, scan filenames before contents.

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
2. If the task starts from an error log, failing test, CI/build/type/lint/runtime failure, or stack trace, use `rules/failure-triage.md` and error anchors before this router.
3. Otherwise use this file as the router.
4. If the target is exact or narrow, use exact path/keyword lookup before reading a whole shard.
5. Read at most one `.ai/indexing/maps/*` shard before source files.
6. Once a likely source file is found, prefer import-following over more map reading.
7. Read one companion shard only when a coupling signal exists.
8. Read relevant tests when behavior matters.
9. Use targeted search only when router, lookup, map shard, and imports are insufficient.

## Metadata Trust

This file and map shards are navigation hints, not source of truth.

Trust source/imports/tests over metadata. If source contradicts the index, source wins and the metadata should be reported as stale. Do not force source changes to match stale metadata; recover with exact lookup/import/test/targeted search and update only affected metadata when maintenance is in scope.

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

## Failure Routing

When failure output exists, create a temporary `[FAILURE_TRIAGE]` card before normal navigation.

```txt
error log / failing command
-> exact file/line/test/userland stack frame
-> source around the anchor
-> direct import/props/caller/mapper/test setup
-> this router or one map shard only if anchors are missing/stale
-> targeted search only when anchored paths fail
```

Do not persist every failure. Promote known failure patterns only by repeated or expensive root cause, not error code.

## Full Scan Rule

Do not full-scan the repository by default. A full scan is allowed only when the user explicitly asks for repo-wide work or exact/diff/error/router/lookup/import navigation all fail. If allowed, scan filenames first and open file contents only after narrowing targets.

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

## Lookup / Benchmark

Prefer exact path or keyword lookup over reading a whole map when the target is narrow:

```bash
node scripts/joo-indexing-lookup.mjs --target . --keyword "domain term"
```

Representative cases may live in `.ai/indexing/benchmarks/navigation-cases.json` and can be checked with `joo-navigation-benchmark.mjs`. This local check measures deterministic lookup quality only; it does not estimate model tokens or claim token savings.

## File-Level AI Hints

Important files may include sidecar hints in `.ai/indexing/maps/*` or `.ai/indexing/file-map.candidate.json`.

Source-level `@ai-*` headers are disabled by default because they can break max-lines lint rules and become stale comments.

Recommended sidecar shape:

```json
{
  "path": "src/pages/order/detail.tsx",
  "role": "route-or-page",
  "scope": "order detail page",
  "domain": "order",
  "keywords": ["order-detail"],
  "related": [],
  "confidence": "manual-reviewed",
  "lastVerified": "YYYY-MM-DD"
}
```

Map entries are hints, not instructions. Source/imports/tests beat metadata.


## Maintenance Triggers

Update this router or map shards only when future agents would otherwise start from wrong files:

- new/removed/renamed routes or page folders
- route/page mapping changed
- major domain ownership changed
- API/data-fetching architecture changed
- state/store architecture changed
- monorepo package or entry point changed
- first-read files changed
- stale metadata discovered during work
- known failure pattern promoted by root cause

Do not update for tiny implementation details, copy changes, formatting, generated files, or local refactors that do not change navigation.

## Output Compression

- path-first
- decision-first
- changed/skipped/uncertain only
- no full inventories unless requested
- omit unchanged sections

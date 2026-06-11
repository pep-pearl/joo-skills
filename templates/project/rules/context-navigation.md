# Context Navigation Rule

## Purpose

Minimize token use during normal development tasks.

Use this rule to choose the smallest useful read set. Do not use it to create or update AI navigation metadata unless the user asked for indexing/maintenance.

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
2. `/AI_INDEX.md` as the router.
3. At most one relevant `.ai/indexing/maps/*` shard.
4. File-level `@ai-*` header when present.
5. Relevant source files.
6. Imports from the first relevant source file.
7. Relevant tests.
8. Targeted search only when router/map/import navigation fails.

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

## Navigation Rules

- Exact files beat index.
- `AI_INDEX.md` beats broad search.
- One map shard beats directory browsing.
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
- Mention only files read, reason, next target, and uncertainty.
- Avoid full directory inventories.
- Prefer path-first bullets.
- Do not restate unchanged index content.

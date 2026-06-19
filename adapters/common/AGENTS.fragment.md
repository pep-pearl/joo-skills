## Joo Skills

Use the local AI navigation system before broad repository exploration.

Project safety rules beat AI navigation rules. Treat AI metadata as hints, not truth.

Concrete task anchors (labels, enum/status values, URL parameters, cache keys, endpoints, error text) beat generic route/page roles. Decompose the task into `surface`, `behavior`, `state`, `data`, `route`, or `failure` concerns and cover only those required concerns.

Default order:

1. If user names exact files, start there.
2. If changed code already exists, run `npm run diff:impact`; if unavailable, inspect changed files directly before normal `AI_INDEX.md` routing.
3. If an error log/failing test/CI/build/type/lint/runtime failure is present, use `rules/failure-triage.md` when present and create a temporary failure card.
4. Read `rules/context-navigation.md` if present.
5. Read `AI_INDEX.md` only when it exists and no stronger exact/diff/error anchor applies. Never read assessment, priority, or local-usage files during normal navigation.
6. Use the lowest active level: Level 1 router only, Level 2 one shard, Level 3 narrow lookup. Read at most one relevant shard if needed.
7. Follow imports/callers/tests only for unresolved concerns; stop when all required concerns are covered.
8. Read one companion shard only when a coupling signal exists.
9. Search broadly only when targeted navigation fails.

Conditional skills:

- Use repo indexing when asked to create, audit, refresh, or maintain AI navigation metadata.
- Use pr-diff-impact when reviewing or planning fixes for already-changed code, PR files, staged files, or `git diff`.
- Use failure triage when work starts from an error log, failing test, CI/build/type/lint/runtime failure, or stack trace. Error anchors beat keyword search.
- Use feedback-compound only after an explicit user correction or a verifiable instruction/scope mismatch. Correct the task first; emotion is not evidence; new lessons apply from the next task and remain advisory.
- Use metadata maintenance after changes that affect routes, page structure, domain ownership, API/data flow, state, map/GIS, packages, first-read files, map shards, stale metadata, or promoted known failure patterns.
- Use screen-spec alignment when official screen specs, PDFs, prototypes, or screenshots are referenced.
- Use API integration planning when connecting frontend UI to Swagger/OpenAPI/backend endpoints.
- Use navigation-benchmark when the user asks for benchmarking with a model. Run the repository benchmark scripts; never fabricate results when the CLI cannot run.

Do not auto-load `docs/prompts/*` unless the user explicitly references them.

Stale metadata rule: source/imports/tests beat AI metadata. If metadata points to missing or wrong files, recover with exact lookup/import/test/targeted search, continue from source, and update only affected metadata when maintenance is in scope.

Full repo scans are forbidden by default. If repo-wide work is truly required, scan filenames first and then open narrowed file contents.

Write safety:

- Before editing, name exact files to change.
- Do not delete, rename, move, repo-wide replace, or broad-codemod unless explicitly requested.
- Do not edit generated, lock, snapshot, build, env, secret, credential, or private config files unless explicitly requested.
- Source/imports/tests beat AI metadata; never change runtime logic to satisfy stale metadata.
- After editing, list changed files, verification, skipped checks, and metadata impact.

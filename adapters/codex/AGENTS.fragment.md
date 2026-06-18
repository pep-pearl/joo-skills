## Joo Skills For Codex

Command aliases:

- `/indexing init`: initialize AI navigation metadata
- `/indexing annotate`: add sidecar file hints without modifying source files by default
- `/indexing audit`: check stale metadata
- `/indexing refresh`: update changed index sections only
- `/indexing explain`: explain current navigation map
- `/failure triage`: create a temporary failure card from error output before repo exploration
- `/diff impact`: classify changed files and choose read-next/skip/metadata targets
- `/diff review`: review changed files, direct imports, and matching tests only
- `/diff fix-plan`: plan the smallest fix path for an existing diff
- `벤치마킹 해줘. 모델: <model>`: run `npm run benchmark -- --model "<model>"`; use no fallback or fabricated result

Project safety rules beat AI navigation rules. Treat AI metadata as hints, not truth.

Concrete task anchors (labels, enum/status values, URL parameters, cache keys, endpoints, error text) beat generic route/page roles. Decompose the task into `surface`, `behavior`, `state`, `data`, `route`, or `failure` concerns and cover only those required concerns.

Before large code work:

1. If code is already changed, run `npm run diff:impact` before normal repo navigation; if unavailable, inspect changed files directly.
2. Run repo navigation mentally.
3. Read `rules/context-navigation.md` when present.
4. If an error log/failing test/build/type/lint/runtime failure is present, use failure anchors first and avoid keyword search.
5. Read `AI_INDEX.md` as the router when normal navigation is needed.
6. Read at most one relevant `.ai/indexing/maps/*` shard before source files; use one companion shard only for coupling signals.
7. Follow imports only for unresolved task concerns and stop when all required concerns are covered.
8. Keep a compact task ledger.
9. After code changes, check AI metadata maintenance, stale metadata recovery, and known failure pattern promotion.

If using oh-my-codex-style flows:

- use `/indexing init` before planning on a new repo
- use `/indexing refresh` after route/domain/API/state/package changes
- run `npm run diff:impact` before reviewing an existing PR or staged diff; if unavailable, inspect changed files directly
- use external best-practice research only when current official docs affect correctness

When metadata is stale, do not force code to match it. Source/imports/tests win; update only affected metadata. Promote known failure patterns by root cause, not error code.

Full repo scans are forbidden by default. If repo-wide work is truly required, scan filenames first and then open narrowed file contents.

Write safety:

- Before editing, name exact files to change.
- Do not delete, rename, move, repo-wide replace, or broad-codemod unless explicitly requested.
- Do not edit generated, lock, snapshot, build, env, secret, credential, or private config files unless explicitly requested.
- Source/imports/tests beat AI metadata; never change runtime logic to satisfy stale metadata.
- After editing, list changed files, verification, skipped checks, and metadata impact.


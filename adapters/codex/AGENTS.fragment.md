## Joo Skills For Codex

Command aliases:

- `/indexing init`: initialize AI navigation metadata
- `/indexing annotate`: add sidecar file hints without modifying source files by default
- `/indexing audit`: check stale metadata
- `/indexing refresh`: update changed index sections only
- `/indexing explain`: explain current navigation map
- `/failure triage`: create a temporary failure card from error output before repo exploration

Project safety rules beat AI navigation rules. Treat AI metadata as hints, not truth.

Before large code work:

1. Run repo navigation mentally.
2. Read `rules/context-navigation.md` when present.
3. If an error log/failing test/build/type/lint/runtime failure is present, use failure anchors first and avoid keyword search.
4. Read `AI_INDEX.md` as the router when normal navigation is needed.
5. Read at most one relevant `.ai/indexing/maps/*` shard before source files; use one companion shard only for coupling signals.
6. Follow imports after finding a likely source file.
7. Keep a compact task ledger.
8. After code changes, check AI metadata maintenance, stale metadata recovery, and known failure pattern promotion.

If using oh-my-codex-style flows:

- use `/indexing init` before planning on a new repo
- use `/indexing refresh` after route/domain/API/state/package changes
- use external best-practice research only when current official docs affect correctness

When metadata is stale, do not force code to match it. Source/imports/tests win; update only affected metadata. Promote known failure patterns by root cause, not error code.

Write safety:

- Before editing, name exact files to change.
- Do not delete, rename, move, repo-wide replace, or broad-codemod unless explicitly requested.
- Do not edit generated, lock, snapshot, build, env, secret, credential, or private config files unless explicitly requested.
- Source/imports/tests beat AI metadata; never change runtime logic to satisfy stale metadata.
- After editing, list changed files, verification, skipped checks, and metadata impact.


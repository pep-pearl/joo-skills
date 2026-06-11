## Joo Skills For Codex

Command aliases:

- `/indexing init`: initialize AI navigation metadata
- `/indexing annotate`: add sparse `@ai-*` headers
- `/indexing audit`: check stale metadata
- `/indexing refresh`: update changed index sections only
- `/indexing explain`: explain current navigation map

Project safety rules beat AI navigation rules. Treat AI metadata as hints, not truth.

Before large code work:

1. Run repo navigation mentally.
2. Read `rules/context-navigation.md` when present.
3. Read `AI_INDEX.md` as the router.
4. Read at most one relevant `.ai/indexing/maps/*` shard before source files; use one companion shard only for coupling signals.
5. Follow imports after finding a likely source file.
6. Keep a compact task ledger.
7. After code changes, check AI metadata maintenance.

If using oh-my-codex-style flows:

- use `/indexing init` before planning on a new repo
- use `/indexing refresh` after route/domain/API/state/package changes
- use external best-practice research only when current official docs affect correctness

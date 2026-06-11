## Joo Skills For Codex

Command aliases:

- `/indexing init`: initialize AI navigation metadata
- `/indexing annotate`: add sparse `@ai-*` headers
- `/indexing audit`: check stale metadata
- `/indexing refresh`: update changed index sections only
- `/indexing explain`: explain current navigation map

Before large code work:

1. Run repo navigation mentally.
2. Read `AI_INDEX.md`.
3. Read only relevant files.
4. Keep a compact task ledger.
5. After code changes, check AI metadata maintenance.

If using oh-my-codex-style flows:

- use `/indexing init` before planning on a new repo
- use `/indexing refresh` after route/domain/API/state changes
- use external best-practice research only when current official docs affect correctness

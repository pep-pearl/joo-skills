## Joo Skills For OpenCode / Generic CLI Agents

Use `AI_INDEX.md` as a small project router, not a full architecture document.

Supported commands:

```txt
/indexing init
/indexing annotate
/indexing audit
/indexing refresh
/indexing explain
```

Project safety rules beat AI navigation rules. Treat AI metadata as hints, not truth.

General behavior:

- path-first
- targeted reads
- read at most one `.ai/indexing/maps/*` shard before source files; use one companion shard only for coupling signals
- follow imports after the first relevant source file
- no full scan by default
- update navigation metadata only when repo navigation changed

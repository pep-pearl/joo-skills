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

General behavior:

- path-first
- targeted reads
- read at most one `.ai/indexing/maps/*` shard before source files
- follow imports after the first relevant source file
- no full scan by default
- update navigation metadata only when repo navigation changed

## Joo Skills For OpenCode / Generic CLI Agents

Use `AI_INDEX.md` as the project adapter.

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
- no full scan by default
- update navigation metadata only when repo navigation changed

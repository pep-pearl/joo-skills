## Joo Skills For OpenCode / Generic CLI Agents

Use `AI_INDEX.md` as a small project router, not a full architecture document.

Supported commands:

```txt
/indexing init
/indexing annotate
/indexing audit
/indexing refresh
/indexing explain
/failure triage
```

Project safety rules beat AI navigation rules. Treat AI metadata as hints, not truth.

General behavior:

- path-first
- targeted reads
- when failure output is present, create a temporary failure card and use file/line/test/userland stack anchors before maps or keyword search
- read at most one `.ai/indexing/maps/*` shard before source files; use one companion shard only for coupling signals
- follow imports after the first relevant source file
- no full scan by default
- update navigation metadata only when repo navigation changed, metadata is stale, or a repeated/expensive failure pattern should be promoted by root cause

If metadata is stale, source/imports/tests win. Recover with exact lookup/import/test/targeted search and update only affected metadata.

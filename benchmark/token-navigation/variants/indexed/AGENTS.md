# Agent navigation contract

For repository navigation tasks:

1. Exact user-provided paths, changed files, failing tests, and error locations beat metadata.
2. Otherwise read `AI_INDEX.md` first.
3. Read at most one `.ai/indexing/maps/*.md` shard before opening source files.
4. Once a source entry point is found, follow its imports/callers/tests; source is authoritative.
5. Do not full-scan file contents by default. If metadata is insufficient, scan filenames before contents.
6. Treat `legacy/`, `archive/`, `examples/`, `apps/playground/`, Storybook, and generated clients as non-production unless explicitly requested.

This benchmark is read-only. Return the smallest useful set of source entry files.

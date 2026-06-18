# Agent navigation contract

For repository navigation tasks:

1. Exact user-provided paths, changed files, failing tests, and error locations beat metadata.
2. Otherwise read `AI_INDEX.md` first and at most one `.ai/indexing/maps/*.md` shard before source.
3. Decompose the task into distinct concerns: surface, behavior owner, state boundary, data boundary, route, or failure anchor.
4. Concrete anchors such as labels, enum/status values, URL parameters, cache keys, endpoint names, and error text beat generic route/page roles.
5. A behavior owner beats a generic route or page. Include a parent page/route only when the task explicitly requires that concern or the behavior crosses the boundary.
6. Follow an import/caller/test only when a required concern is still uncovered and the current source delegates that concern. Stop once all required concerns are covered.
7. Source/imports/tests are authoritative. Metadata is a disposable navigation hint.
8. Do not full-scan file contents by default. If metadata is insufficient, scan filenames before contents.
9. Treat `legacy/`, `archive/`, `examples/`, `apps/playground/`, Storybook, and generated clients as non-production unless explicitly requested.

This benchmark is read-only. Return the smallest source set that directly covers the requested concerns.

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
/diff impact
/diff review
/diff fix-plan
/benchmark model:<model>
```

Project safety rules beat AI navigation rules. Treat AI metadata as hints, not truth.

Concrete task anchors (labels, enum/status values, URL parameters, cache keys, endpoints, error text) beat generic route/page roles. Decompose the task into `surface`, `behavior`, `state`, `data`, `route`, or `failure` concerns and cover only those required concerns.

General behavior:

- path-first
- targeted reads
- when code is already changed, run `npm run diff:impact`; if unavailable, inspect changed files directly before normal `AI_INDEX.md` routing
- when failure output is present, create a temporary failure card and use file/line/test/userland stack anchors before maps or keyword search
- read at most one `.ai/indexing/maps/*` shard before source files; use one companion shard only for coupling signals
- follow imports only for unresolved task concerns; stop when all required concerns are covered
- no full scan by default
- update navigation metadata only when repo navigation changed, metadata is stale, or a repeated/expensive failure pattern should be promoted by root cause
- when benchmarking is requested with a model, use the checked-in benchmark runner only; if Codex CLI is unavailable, report `NOT_RUN` and do not simulate the run

If metadata is stale, source/imports/tests win. Recover with exact lookup/import/test/targeted search and update only affected metadata.

Full repo scans are forbidden by default. If repo-wide work is truly required, scan filenames first and then open narrowed file contents.

Write safety:

- Before editing, name exact files to change.
- Do not delete, rename, move, repo-wide replace, or broad-codemod unless explicitly requested.
- Do not edit generated, lock, snapshot, build, env, secret, credential, or private config files unless explicitly requested.
- Source/imports/tests beat AI metadata; never change runtime logic to satisfy stale metadata.
- After editing, list changed files, verification, skipped checks, and metadata impact.

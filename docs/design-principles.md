# Design Principles

## 1. Router, Not Architecture Bible

`AI_INDEX.md` should tell future agents where to start reading or which map shard to open.

It should not become a long architecture essay or full file inventory.

Good:

```md
- route/page/screen work: `.ai/indexing/maps/routes.md`
- API work: `.ai/indexing/maps/api.md`
- Auth domain: `.ai/indexing/maps/domains/auth.md`
- First route root: `src/app/routes.tsx`
```

Bad:

```md
This project follows a deeply layered architectural philosophy...
```

Also bad:

```md
src/
  app/
    routes.tsx
    providers.tsx
  pages/
    ... every file in the repo ...
```

## 2. Minimum Read Set

Every task should start from the smallest likely file set:

1. exact files from user
2. project/team safety rules
3. failure anchors when an error log/failing command exists
4. project router: `AI_INDEX.md`
5. at most one map shard
6. entry point
7. imported files
8. one companion shard only when a coupling signal exists
9. tests
10. broader search only when blocked

## 3. Failure Anchors Beat Normal Routing

When a task starts from an error log, failing test, CI/build/type/lint/runtime failure, or stack trace, produce a temporary `[FAILURE_TRIAGE]` card before repo exploration.

Use file/line/test/userland stack anchors before keyword search or map shards. Generated files are never first-read files; read the human-owned wrapper, mapper, hook, config, or test boundary first.

Persist known failure patterns only when a root cause repeats or wastes enough navigation cost to save future agents from broad reading. Do not promote based on error code alone.

## 4. Cheap Escalation, Not Broad Reading

The default remains one map shard.

Escalate by one companion shard only when a coupling signal exists:

- route + auth/session/permission
- route + API/query/cache
- UI bug + theme/style/token/responsive
- form + validation/API error
- generated client/schema mismatch

Hard cap before edit:

- map shards: 2
- source files: 5

This keeps token use bounded while avoiding confidently wrong edits from under-reading.

## 5. Metadata Is A Hint, Not Truth

Trust order:

1. exact files from user
2. project/team safety rules
3. source/imports/tests
4. `AI_INDEX.md`
5. map shards
6. generated candidates

When source/imports contradict metadata, source wins and the metadata should be reported as stale. Do not force source changes to match stale metadata. Recover with exact lookup/import/test/targeted symbol or path search, then update only affected metadata.

## 6. Map Shards Are Optional Detail

Detailed navigation belongs in `.ai/indexing/maps/*`, not in `AI_INDEX.md`.

Recommended shards:

- `root.md`: vague or ambiguous task fallback
- `routes.md`: routes, pages, screens, layouts
- `api.md`: API clients, query/mutation hooks, OpenAPI/Swagger
- `state.md`: stores, cache, atoms, session
- `packages.md`: package/workspace/build/test config
- `domains/*.md`: domain-specific maps when useful

Rules:

- read one shard first, not all shards
- use exact path / keyword lookup before opening a whole shard when the target is narrow
- keep each shard path-first and capped
- one-line purpose per file
- include natural-language aliases only when useful
- once source entry is found, follow imports

## 7. Source Headers Are Disabled By Default

Prefer sidecar metadata in `.ai/indexing/maps/*` and `.ai/indexing/file-map.candidate.json`. Use source-level `@ai-*` headers only when the project explicitly opts in and max-lines lint will not fail.

Good targets:

- route definitions
- app bootstrap
- providers
- stores
- API clients
- domain services
- page entries
- complex feature modules

Bad targets:

- trivial components
- constants
- generated code
- snapshots
- barrels with no meaning

Prefer minimal sidecar entries:

```json
{
  "path": "src/pages/login.tsx",
  "role": "route-or-page",
  "scope": "login page",
  "domain": "auth",
  "keywords": ["login", "signin", "로그인"],
  "related": [],
  "confidence": "manual-reviewed",
  "lastVerified": "YYYY-MM-DD"
}
```

Use source headers only as explicit exceptions. Hint content must be factual and must not command the agent to skip tests, ignore errors, or bypass imports.


## 8. Index Maintenance Is Part Of Done

After code changes, decide whether metadata changed.

No need to update for tiny internal implementation details.

Update when future agents would otherwise read the wrong files.

Update only affected metadata:

- router changed -> `AI_INDEX.md`
- route/page changed -> `maps/routes.md`
- API/query changed -> `maps/api.md`
- store/cache changed -> `maps/state.md`
- package/build changed -> `maps/packages.md`
- domain ownership changed -> related `maps/domains/*.md`
- stale metadata discovered -> smallest affected router/shard/hint
- known failure pattern promoted -> chosen compact failure pattern note

## 9. Measure Navigation Quality

Good AI navigation metadata should be checked, not only reviewed by eye. Keep representative lookup cases under `.ai/indexing/benchmarks/navigation-cases.json` and run `joo-navigation-benchmark.mjs` after large indexing changes. This local check is deterministic and does not claim token savings. Use the isolated `benchmark/token-navigation` A/B runner only when a real model CLI is available.

Use diff-based metadata checks in PRs so route/API/state/package changes do not silently stale the router or map shards.

## 10. Borrow Patterns, Do Not Clone Systems

This repo borrows ideas from workflow/agent ecosystems:

- command-style skills
- durable project state
- repo map / symbol map
- semantic navigation
- AI-friendly packing
- sharded navigation maps

It intentionally keeps the implementation personal, lightweight, optional, and copy-ready.

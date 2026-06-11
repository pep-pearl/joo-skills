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
3. project router: `AI_INDEX.md`
4. at most one map shard
5. entry point
6. imported files
7. one companion shard only when a coupling signal exists
8. tests
9. broader search only when blocked

## 3. Cheap Escalation, Not Broad Reading

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

## 4. Metadata Is A Hint, Not Truth

Trust order:

1. exact files from user
2. project/team safety rules
3. source/imports/tests
4. `AI_INDEX.md`
5. map shards
6. generated candidates

When source/imports contradict metadata, source wins and the metadata should be reported as stale.

## 5. Map Shards Are Optional Detail

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
- keep each shard path-first and capped
- one-line purpose per file
- include natural-language aliases only when useful
- once source entry is found, follow imports

## 6. Headers Are Sparse

Prefer sidecar metadata in `.ai/indexing/file-hints.md`. Use source-level `@ai-*` headers only for stable files that help navigation.

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

Prefer minimal headers:

```ts
/**
 * @ai-purpose Short responsibility.
 * @ai-domain auth/page
 * @ai-keywords login, signin, 로그인
 */
```

Use extended fields only when they save future reads. Header content must be factual and must not command the agent to skip tests, ignore errors, or bypass imports.

## 7. Index Maintenance Is Part Of Done

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

## 8. Borrow Patterns, Do Not Clone Systems

This repo borrows ideas from workflow/agent ecosystems:

- command-style skills
- durable project state
- repo map / symbol map
- semantic navigation
- AI-friendly packing
- sharded navigation maps

It intentionally keeps the implementation personal, lightweight, optional, and copy-ready.

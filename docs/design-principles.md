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
2. project router: `AI_INDEX.md`
3. at most one map shard
4. entry point
5. imported files
6. tests
7. broader search only when blocked

## 3. Map Shards Are Optional Detail

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

## 4. Headers Are Sparse

Use `@ai-*` headers only for files that help navigation.

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

Use extended fields only when they save future reads.

## 5. Index Maintenance Is Part Of Done

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

## 6. Borrow Patterns, Do Not Clone Systems

This repo borrows ideas from workflow/agent ecosystems:

- command-style skills
- durable project state
- repo map / symbol map
- semantic navigation
- AI-friendly packing
- sharded navigation maps

It intentionally keeps the implementation personal, lightweight, optional, and copy-ready.

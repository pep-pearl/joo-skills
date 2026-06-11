# Design Principles

## 1. Project Adapter, Not Architecture Bible

`AI_INDEX.md` should tell future agents where to start reading.

It should not become a long architecture essay.

Good:

```md
- Routing: `src/app/routes.tsx`
- Auth pages: `src/pages/auth/*`
- API client: `src/shared/api/client.ts`
```

Bad:

```md
This project follows a deeply layered architectural philosophy...
```

## 2. Minimum Read Set

Every task should start from the smallest likely file set:

1. exact files from user
2. project index
3. entry point
4. imported files
5. tests
6. broader search only when blocked

## 3. Headers Are Sparse

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

## 4. Index Maintenance Is Part Of Done

After code changes, decide whether metadata changed.

No need to update for tiny internal implementation details.
Update when future agents would otherwise read the wrong files.

## 5. Borrow Patterns, Do Not Clone Systems

This repo borrows ideas from workflow/agent ecosystems:

- command-style skills
- durable project state
- repo map / symbol map
- semantic navigation
- AI-friendly packing

It intentionally keeps the implementation personal, lightweight, and copy-ready.

# AI_INDEX.md

## Purpose

Small router for a React/FSD-like monorepo.

Detailed file maps live in `.ai/indexing/maps/*`.

## Project Shape

- stack: React, TypeScript
- package manager: pnpm
- architecture: app -> pages -> widgets -> features -> entities -> shared
- routing: React Router
- main app: `apps/web`

## Navigation Order

1. Exact files first.
2. Read this router.
3. Read at most one relevant map shard.
4. Follow imports downward.
5. Read tests when behavior matters.
6. Use targeted search only when blocked.

## Task Router

- route/page/screen: `.ai/indexing/maps/routes.md`
- vague product wording: `.ai/indexing/maps/root.md`
- API/query/backend: `.ai/indexing/maps/api.md`
- state/store/cache: `.ai/indexing/maps/state.md`
- package/build/config: `.ai/indexing/maps/packages.md`
- auth domain: `.ai/indexing/maps/domains/auth.md`
- dashboard domain: `.ai/indexing/maps/domains/dashboard.md`

## First-Read Defaults

- app bootstrap: `apps/web/src/main.tsx`
- route root: `apps/web/src/app/routes.tsx`
- API client: `apps/web/src/shared/api/client.ts`
- global state: `apps/web/src/shared/store/app-store.ts`
- query provider: `apps/web/src/shared/query/query-provider.tsx`

## FSD Rules

- `app`: routing/providers/global setup only
- `pages`: route-level UI flow
- `widgets`: large reusable blocks
- `features`: user actions/forms/interactions
- `entities`: domain model/pure logic
- `shared`: reusable UI/utils/hooks/API

Respect dependency direction.

## Read Budget

- maps: 0-1
- source files: 1-3 before deciding next
- tests: when behavior matters
- broad search: only after targeted navigation fails

## Future-Agent Defaults

- Use route root first for route/page work.
- Use one map shard, then source imports.
- Avoid broad scans.
- Update affected map shards when route/page/API/state ownership changes.

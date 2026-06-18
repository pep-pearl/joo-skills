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

## Task Concern Rule

Concrete task anchors beat generic route/page roles. Cover only the required `surface`, `behavior`, `state`, `data`, `route`, or `failure` concerns and stop when they are covered.

## Navigation Order

1. Exact files first.
2. Read this router.
3. Read at most one relevant map shard.
4. Follow imports only for unresolved concerns; stop when all required concerns are covered.
5. Read one companion shard only when a coupling signal exists.
6. Read tests when behavior matters.
7. Use targeted search only when blocked.

## Metadata Trust

This router and map shards are navigation hints, not source of truth. Source/imports/tests beat metadata.

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

## Cheap Escalation

Read one companion shard only when a coupling signal exists. Hard cap before edit: 2 map shards and 5 source files.

## Read Budget

- maps: 0-1, or 2 only with a coupling signal
- source files: 1-3 before deciding next
- tests: when behavior matters
- broad search: only after targeted navigation fails

## Future-Agent Defaults

- Use route root first for route/page work.
- Use one map shard, then source imports. Use one companion shard only when coupled.
- Avoid broad scans.
- Update affected map shards when route/page/API/state ownership changes.

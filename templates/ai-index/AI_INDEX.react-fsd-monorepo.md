# AI_INDEX.md

## Purpose

Small router for a React/FSD-like monorepo.

Keep short, factual, path-first. Put detailed maps in `.ai/indexing/maps/*`.

## Project Shape

- stack: React / TypeScript
- package manager: pnpm or yarn workspace
- architecture: app -> pages -> widgets -> features -> entities -> shared
- routing: React Router or framework route files
- main app: `TODO`

## Task Concern Rule

Concrete task anchors beat generic route/page roles. Cover only the required `surface`, `behavior`, `state`, `data`, `route`, or `failure` concerns and stop when they are covered.

## Navigation Order

1. Exact files first.
2. Read this router.
3. Read at most one map shard.
4. Follow imports only for unresolved concerns:
   - pages -> widgets -> features -> entities -> shared
5. Read one companion shard only when a coupling signal exists.
6. Read tests when behavior matters.
7. Search broadly only when blocked.

## Metadata Trust

This router and map shards are navigation hints, not source of truth. Source/imports/tests beat metadata.

## Task Router

- route/page/screen: `.ai/indexing/maps/routes.md`
- vague product wording: `.ai/indexing/maps/root.md`
- label/formatter/validation/UI actions: `.ai/indexing/maps/behavior.md`
- API/query/backend: `.ai/indexing/maps/api.md`
- state/store/cache: `.ai/indexing/maps/state.md`
- package/build/config: `.ai/indexing/maps/packages.md`
- domain-specific: `.ai/indexing/maps/domains/<domain>.md` when present

## First-Read Defaults

- app bootstrap: `TODO`
- route root: `TODO`
- global state: `TODO`
- API client: `TODO`
- query provider: `TODO`
- test setup: `TODO`

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

## Maintenance Triggers

Update router or affected shards when routes, page mapping, domain ownership, API/state/map architecture, packages, or first-read files change.

# AI_INDEX.md

## Purpose

AI repo navigation map for a React/FSD-like monorepo.

Keep short, factual, path-first.

## Project

- stack: React / TypeScript
- package manager: pnpm or yarn workspace
- architecture: app -> pages -> widgets -> features -> entities -> shared
- routing: React Router or framework route files

## Read Algorithm

1. Exact files first.
2. Route/page task:
   - start at route config
   - follow route module
   - open page entry
3. Follow imports downward:
   - pages -> widgets -> features -> entities -> shared
4. Do not scan all `src`.
5. Check `@ai-*` headers before full file reads.

## Main Entries

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

## Maintenance Triggers

Update when routes, page mapping, domain ownership, API/state/map architecture, or first-read files change.

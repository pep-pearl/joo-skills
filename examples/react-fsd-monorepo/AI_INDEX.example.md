# AI_INDEX.md

## Purpose

AI repo navigation map for a React/FSD-like monorepo.

## Project

- stack: React, TypeScript
- package manager: pnpm
- architecture: app -> pages -> widgets -> features -> entities -> shared
- routing: React Router
- main app: `apps/web`

## Read Algorithm

1. Exact files first.
2. For route/page tasks, start at `apps/web/src/app/routes.tsx`.
3. Map route to `apps/web/src/pages/<domain>`.
4. Follow imports downward.
5. Do not scan all `apps/web/src`.
6. Check file-level `@ai-*` headers before full file read.

## Main Entries

- `apps/web/src/main.tsx`: app bootstrap
- `apps/web/src/app/routes.tsx`: route root
- `apps/web/src/shared/api/client.ts`: API client
- `apps/web/src/shared/store/app-store.ts`: global state
- `apps/web/src/shared/query/query-provider.tsx`: query setup

## Domain Map

- auth:
  - routes: `apps/web/src/app/auth-routes.tsx`
  - pages: `apps/web/src/pages/login`, `apps/web/src/pages/signup`
  - API: `packages/domains/auth`
- dashboard:
  - routes: `apps/web/src/app/service-routes.tsx`
  - pages: `apps/web/src/pages/dashboard`

## Future-Agent Defaults

- Use route root first.
- Follow imports.
- Avoid broad scans.
- Update index when route/page/API/state ownership changes.

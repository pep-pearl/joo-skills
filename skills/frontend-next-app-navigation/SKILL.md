# Frontend Next App Navigation Skill

## Purpose

Navigate frontend repositories where Next.js App Router is the route source of truth.

Use this instead of FSD navigation when routing is owned by `app/**/page.tsx`, route segments, layouts, route handlers, server actions, and server/client component boundaries.

## Applicability Guard

Use this skill when the project has clear Next App Router signals:

- `app/**/page.tsx` or `app/**/layout.tsx`
- route groups such as `app/(dashboard)/...`
- dynamic segments such as `app/orders/[orderId]/page.tsx`
- `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`, or server actions

Do not use this skill when:

- React Router or TanStack Router owns route definitions
- Remix route modules own loader/action/component
- a vertical-slice package owns routing outside `app/`
- the user names an exact source file; exact file still wins

## Read Order

1. Exact file from user, if provided.
2. Nearest project/team safety rules.
3. `AI_INDEX.md` router.
4. `.ai/indexing/maps/routes.md` only when the target route is not obvious.
5. Target `app/**/page.tsx` route entry.
6. Nearest `layout.tsx`, `template.tsx`, `loading.tsx`, `error.tsx`, or `not-found.tsx` only when behavior/layout depends on it.
7. Server/client boundary:
   - check `"use client"` before assuming hooks/browser APIs are allowed
   - check server data fetching before adding client state
8. Data boundary:
   - server function / route handler / query hook / domain API
9. Imported components directly used by the route.
10. Tests/stories only when behavior or regression risk matters.

## Cheap Escalation

Read one companion shard only when coupled:

- route + API/cache/server action -> `maps/api.md`
- route + session/permission/auth guard -> `maps/state.md`
- route + shared design-system issue -> exact imported component only
- generated client/schema mismatch -> exact operation/type boundary only

Hard cap before edit:

- map shards: 2
- source files: 5
- broad search only after exact file, route map, and imports fail

## Do Not Start Here

Do not start from these unless the user names them or imports lead there:

- `src/shared/ui/*`
- generated OpenAPI clients
- global CSS/theme files
- generic layout shell outside the target segment
- snapshot/story files

## Output

```txt
Start:
- `app/orders/[orderId]/page.tsx`: target route entry

Then:
- `app/orders/[orderId]/loading.tsx`: loading state visible in route
- `src/entities/order/api/getOrder.ts`: server data boundary

Skipped:
- shared UI search: route imports were enough

Uncertain:
- ...
```

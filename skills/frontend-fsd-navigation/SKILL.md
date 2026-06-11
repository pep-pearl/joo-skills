# Frontend FSD Navigation Skill

## Purpose

Navigate frontend repositories that use FSD-like layering, route-driven pages, and shared domain packages.

## Applicability Guard

Use this skill only when the project is FSD-like.

Signals:

- `app/`, `pages/`, `widgets/`, `features/`, `entities/`, `shared/`
- domain slices under `features` or `entities`
- page entries importing widgets/features downward
- stable layer direction from app/page to shared utilities

Do not assume FSD when:

- Next.js App Router owns routing through `app/**/page.tsx`
- Remix route modules own loader/action/component together
- TanStack Router file routes are the source of truth
- monorepo packages own vertical domains
- project has no stable FSD layers

If not FSD-like:

- use `repo-navigation`
- start from route/framework entry
- follow imports
- do not force `app -> pages -> widgets -> features -> entities -> shared`

## Layer Direction

Default dependency direction:

```txt
app -> pages -> widgets -> features -> entities -> shared
```

Read downward. Do not jump directly into `shared` unless imported by the target flow.

## Route/Page Task

Read order:

1. route definition
2. route module for target area
3. page entry
4. imported widgets/features
5. entity/domain model
6. shared utilities directly imported
7. relevant tests/stories

Cheap escalation:

- if route/page behavior depends on query/mutation/cache, read the API map or exact hook next
- if route/page behavior depends on session/permission, read the state/session map or exact guard next

## UI Bug Task

Read order:

1. exact component if named
2. nearest page entry
3. model/hook/state file
4. child components
5. style/theme helpers directly imported
6. story/test if available

Do not start from `shared/ui` unless the target flow imports that component or the user names it.

## State Task

Read order:

1. global store or query provider
2. consuming hooks/components
3. API/domain dependency
4. tests

## API Task

Read order:

1. page or hook using data
2. shared API client
3. domain package/factory
4. generated client/schema for the exact operation only
5. mock/dummy fallback
6. tests

## Output Style

Path-first, compact:

```txt
Start:
- `src/app/routes.tsx`: route mapping
- `src/pages/orders/ui.tsx`: page entry

Then:
- `src/features/orders/filter.tsx`: imported by page
```

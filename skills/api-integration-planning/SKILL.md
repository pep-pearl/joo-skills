# API Integration Planning Skill

## Purpose

Plan frontend API integration from Swagger/OpenAPI/domain specs without breaking UI flow.

## When To Use

- connecting frontend screen to backend API
- replacing mock/dummy data
- creating domain API package
- reconciling screen spec vs Swagger
- fixing API type mismatch

## Read Order

1. user-provided API/spec files
2. page or hook using data
3. shared API client
4. domain package
5. generated OpenAPI client
6. mock/dummy fallback
7. tests

## Classification

Every API task should classify each endpoint:

- `real-api`: available and wired
- `dummy-wired`: UI uses dummy implementation behind domain API
- `backend-pending`: endpoint missing or unusable
- `deferred`: intentionally postponed
- `spec-conflict`: Swagger and screen spec disagree

## Planning Output

```txt
API Plan:
- screen:
- current data source:
- target endpoint:
- domain package:
- types:
- query/mutation:
- fallback:
- tests:
```

## Rules

- Domain API boundary first, page wiring second.
- Do not leak generated client details into page components.
- Keep dummy fallback behind API/domain layer.
- Preserve user-visible UI behavior while swapping data source.
- Update AI_INDEX if API architecture or domain ownership changes.

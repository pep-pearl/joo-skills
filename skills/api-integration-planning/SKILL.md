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
5. generated OpenAPI client for the exact operation/type only
6. mock/dummy fallback
7. tests

Do not inspect every endpoint or paste full Swagger schemas unless the user explicitly asks.

## Classification

Every API task should classify each endpoint:

- `real-api`: available and wired
- `dummy-wired`: UI uses dummy implementation behind domain API
- `backend-pending`: endpoint missing or unusable
- `deferred`: intentionally postponed
- `spec-conflict`: Swagger and screen spec disagree

## Compact Contract Card

For each endpoint, write at most one compact card.

```txt
Endpoint:
- status: real-api | dummy-wired | backend-pending | deferred | spec-conflict
- screen:
- caller:
- domain boundary:
- query key:
- request shape:
- response risk:
- error mapping:
- fallback:
- test target:
```

Rules:

- Do not paste full Swagger schema.
- Do not inspect all endpoints.
- Inspect only endpoints used by the current screen/flow.
- Generated client may be read only at the specific operation/type boundary.
- Prefer runtime behavior and UI contract over generated-client internals.

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

Contract Cards:
- ...
```

## Rules

- Domain API boundary first, page wiring second.
- Do not leak generated client details into page components.
- Keep dummy fallback behind API/domain layer.
- Preserve user-visible UI behavior while swapping data source.
- Update AI_INDEX if API architecture or domain ownership changes.

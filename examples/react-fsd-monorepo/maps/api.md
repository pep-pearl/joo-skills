# API / Query Map

## Scope

API client, query provider, domain API functions.

## First Read

- `apps/web/src/shared/api/client.ts`: shared HTTP client
- `apps/web/src/shared/query/query-provider.tsx`: query provider
- `packages/domains/auth`: auth API/domain package

## Read Rule

After finding an API function, follow imports to types or generated clients only for an unresolved concern.

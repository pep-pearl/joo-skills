# State / Store Map

## Scope

Global app state, session state, cache/query state.

## First Read

- `apps/web/src/shared/store/app-store.ts`: global app store
- `apps/web/src/shared/query/query-provider.tsx`: server cache setup

## Read Rule

Follow imports from the store/query entry only for unresolved concerns. Stop when coverage is complete; do not scan all features.

# Indexing Shards

## Goal

Avoid two failure modes:

1. AI reads the full repository.
2. AI reads a giant index that is almost as expensive as the repository.

The solution is a small router plus optional sharded maps.

```txt
AI_INDEX.md
  -> choose one map shard
  -> choose one companion shard only when a coupling signal exists
.ai/indexing/maps/root.md
.ai/indexing/maps/routes.md
.ai/indexing/maps/behavior.md
.ai/indexing/maps/api.md
.ai/indexing/maps/state.md
.ai/indexing/maps/packages.md
.ai/indexing/maps/domains/*.md
```

## Roles

### `AI_INDEX.md`

Stable router.

Should answer:

- what kind of project is this?
- what task type is this?
- which one shard should be read next?
- what are the most stable first-read files?

Should not contain:

- full file tree
- long architecture explanation
- generated inventories
- every domain detail

### `manifest.json`

Machine-readable catalog.

Used by scripts/audits. AI does not need to read it during every normal task.

### `maps/root.md`

Fallback for vague natural-language requests.

Use when the user says things like:

- "이 화면 흐름 이상해"
- "지도 선택 쪽 고쳐줘"
- "회원 관련 부분 봐줘"
- "어디부터 봐야 할지 모르겠어"

### `maps/routes.md`

Routes, pages, screens, layouts, route guards.

### `maps/behavior.md`

Concrete labels, badges, formatters, mappers, validation, buttons, fields, toggles, and UI action owners. Concrete behavior anchors beat generic route/page entries.

### `maps/api.md`

API clients, query/mutation hooks, OpenAPI/Swagger, backend endpoint mapping.

### `maps/state.md`

Global state, stores, atoms, cache, session, persistence.

### `maps/packages.md`

Package manager, workspace layout, build/test/lint config.

### `maps/domains/*.md`

Domain-specific entry points and relations.

Create only for domains that save future reads.

## Runtime Rule

```txt
exact file from user
-> project/team safety rules
-> error log / failing command anchors, when present
-> AI_INDEX.md
-> one map shard
-> source file
-> imports
-> companion shard only when coupled
-> tests
-> targeted search
```

Do not read every shard.

## Metadata Trust

Map shards are disposable navigation hints.

Source/imports/tests beat map metadata. If a map points to missing or misleading files, report it as stale, recover with exact lookup/import/test/targeted symbol or path search, and update only the affected metadata when maintenance is in scope.

## Failure Anchors

Failure output is a temporary runtime router, not a map shard.

```txt
error log / failing command
-> exact file/line/test/userland stack frame
-> source around the anchor
-> direct import/props/caller/mapper/test setup
-> one map shard only if anchors are missing or stale
```

Do not create permanent error maps for one-off failures. Promote only repeated or expensive root-cause patterns.

## Cheap Escalation

Read one companion shard only when a coupling signal exists.

- route/page + data issue -> `maps/api.md`
- route/page + session/permission issue -> `maps/state.md`
- API task + visible page behavior -> `maps/routes.md`
- state/cache ownership issue -> `maps/api.md`

Hard cap before edit: 2 map shards and 5 source files.

## Shard Format

Recommended sections:

```md
# Domain Map: auth

## Metadata
confidence: manual-reviewed
last_verified: 2026-06-11
source: human-maintained

## Scope
login, logout, session, permission

## First Read
- `src/pages/login/LoginPage.tsx`: login route entry
- `src/features/auth/login/useLoginForm.ts`: login behavior

## File Map
- `path`: one-line purpose; keywords: ...

## Relations
- LoginPage -> useLoginForm -> authApi.login -> sessionStore

## Do Not Start Here
- `src/shared/ui/Button.tsx`: generic UI only

## Staleness Triggers
- login route moved
- session store changed
```

## Size Caps

Recommended caps:

- `AI_INDEX.md`: 80-140 lines
- `root.md`: about 120 lines
- route/API/state/package maps: about 160-220 lines
- domain map: about 160 lines
- each file entry: one line

When a cap is exceeded, truncate and point to targeted search.

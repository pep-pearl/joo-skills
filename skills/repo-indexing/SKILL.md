# Repo Indexing Skill

## Purpose

Create and maintain a compact project navigation system for AI agents.

This skill turns an unknown repository into a repo with:

- `AI_INDEX.md` router
- `.ai/indexing/manifest.json`
- `.ai/indexing/maps/*` compact map shards
- `AGENTS.md` loading guidance
- `rules/context-navigation.md`
- `rules/ai-navigation-maintenance.md`
- sparse file-level `@ai-*` headers
- optional `.ai/indexing/*` scan outputs

## Core Direction

`AI_INDEX.md` should stay small. It routes future agents to the right shard or source file.

Map shards hold optional detail:

- `.ai/indexing/maps/root.md`: top-level repo areas and ambiguous-request fallback
- `.ai/indexing/maps/routes.md`: route/page/screen starting points
- `.ai/indexing/maps/api.md`: API/query/client/OpenAPI starting points
- `.ai/indexing/maps/state.md`: store/cache/session starting points
- `.ai/indexing/maps/packages.md`: package/workspace/build/config starting points
- `.ai/indexing/maps/domains/*.md`: domain-specific maps when useful

Do not create a giant file tree. Shards should be compact, path-first, and disposable.

## Trigger Phrases

Use this skill when the user says:

- `/indexing`
- `/indexing init`
- `/indexing annotate`
- `/indexing audit`
- `/indexing refresh`
- "AI_INDEX 만들어줘"
- "AGENTS.md 만들어줘"
- "이 프로젝트 AI가 잘 읽게 인덱싱해줘"
- "파일에 ai용 주석 달아줘"
- "future agents가 빨리 읽게 해줘"

## Safety

Do not rewrite runtime logic while indexing.

Do not add headers to every file.

Do not full-scan the repository unless:

- the user explicitly asks
- no index exists and targeted discovery failed
- existing index is stale or misleading

Generated metadata should be path-first, factual, and compact.

## Command Behavior

### `/indexing init`

Goal:

- discover project shape
- create or update `AI_INDEX.md` as a router
- create or update compact map shards under `.ai/indexing/maps/*`
- create or update `.ai/indexing/manifest.json`
- create or update navigation rules
- prepare `AGENTS.md` loading guidance
- identify candidate files for sparse `@ai-*` headers

Read order:

1. package/workspace files
2. existing `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, `.ai/*`
3. existing `AI_INDEX.md`
4. app/bootstrap/routing candidates
5. state/API/domain candidates
6. tests only if relevant

Output:

```txt
[INDEXING_INIT_SUMMARY]

Created:
- ...

Updated:
- ...

Map shards:
- ...

Header candidates:
- ...

Skipped:
- ...

Uncertain:
- ...
```

### `/indexing annotate`

Goal:

- add or update sparse `@ai-*` headers on important files

Candidate files:

- app bootstrap
- route definitions
- providers
- layout shells
- stores
- API clients
- domain services
- page entries
- complex features
- map/GIS engines
- test setup files

Skip:

- trivial UI components
- generated code
- snapshots
- constants
- assets
- barrels unless they are real public API boundaries

Minimal header format:

```ts
/**
 * @ai-purpose Short responsibility.
 * @ai-domain routing | auth | map | gis | ui | api | state | feature | page | entity | shared | test | config
 * @ai-keywords Searchable names, routes, hooks, APIs, user-facing aliases.
 */
```

Extended header fields are optional and should be used only when they save future reads:

```ts
/**
 * @ai-entry true | false
 * @ai-depends Important internal dependencies.
 * @ai-used-by Main callers or areas.
 * @ai-notes Important modification notes. Omit if unnecessary.
 */
```

### `/indexing audit`

Goal:

- compare current repo with `AI_INDEX.md`, manifest, map shards, and headers
- report stale, missing, or misleading navigation metadata

Check:

- route files referenced by index still exist
- page/domain paths still exist
- package list still matches workspace
- API/state/map entries still match likely files
- important new folders are not missing from map shards
- AGENTS/rules loading still makes sense
- `AI_INDEX.md` is still router-sized, not an inventory

Output:

```txt
[INDEXING_AUDIT]

Healthy:
- ...

Stale:
- ...

Missing:
- ...

Recommended updates:
- ...

Do not update:
- ...
```

### `/indexing refresh`

Goal:

- update only changed index sections and affected shards
- avoid rewriting stable sections

Refresh targets:

- router in `AI_INDEX.md`
- manifest map list
- routes map
- page/domain maps
- package/workspace map
- API/data flow map
- state management map
- map/GIS/domain flow maps
- first-read files
- maintenance triggers

Output should mention only changed, skipped, and uncertain items.

### `/indexing explain`

Goal:

- explain how current repo indexing works
- list first-read files and map shards
- do not modify files

## AI_INDEX Contract

`AI_INDEX.md` is a project router.

It should answer:

- What kind of project is this?
- What is the minimum navigation order?
- Which task type maps to which shard?
- Which first-read files are stable enough to list?
- When should this router or map shards be updated?

It should not:

- duplicate README
- document every folder
- contain a full file tree
- become a historical changelog
- contain long implementation details
- include generated scan inventories

Suggested size:

- 80-140 lines
- 800-1,500 tokens
- one-line bullets over prose

## Map Shard Contract

Map shards are optional detail files used only when the router points to them.

Each shard should include:

- `Scope`: what kind of task it helps
- `First Read`: highest-value files only
- `File Map`: one-line purpose and keywords
- `Relations`: only high-value flow/import relations
- `Do Not Start Here`: known token traps
- `Staleness Triggers`: when to refresh

Do not exceed practical caps:

- root map: about 120 lines
- route/API/state/package map: about 160-220 lines
- domain map: about 160 lines
- one file entry: one short line plus optional keywords

## File Header Contract

A file-level AI header is a navigation hint, not documentation.

Keep it:

- short
- factual
- searchable
- stable
- useful before reading full file

## Final Response Style

Compact Korean or user language.

Prefer:

```txt
Updated:
- AI_INDEX.md: router now points to route/API/state shards
- .ai/indexing/maps/routes.md: refreshed route/page starts
- rules/context-navigation.md: added read budget

Skipped:
- trivial UI components
- generated API files

Uncertain:
- auth domain ownership appears split between ...
```

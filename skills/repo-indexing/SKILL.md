# Repo Indexing Skill

## Purpose

Create and maintain a compact project navigation system for AI agents.

This skill turns an unknown repository into a repo with:

- `AI_INDEX.md`
- `AGENTS.md` loading guidance
- `rules/context-navigation.md`
- `rules/ai-navigation-maintenance.md`
- sparse file-level `@ai-*` headers
- optional `.ai/indexing/*` scan outputs

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
- create or update `AI_INDEX.md`
- create or update navigation rules
- prepare `AGENTS.md` loading guidance
- identify candidate files for `@ai-*` headers

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

Header format:

```ts
/**
 * @ai-purpose Short responsibility.
 * @ai-entry true | false
 * @ai-domain routing | auth | map | gis | ui | api | state | feature | page | entity | shared | test | config
 * @ai-depends Important internal dependencies.
 * @ai-used-by Main callers or areas.
 * @ai-keywords Searchable names, routes, hooks, APIs.
 * @ai-notes Important modification notes. Omit if unnecessary.
 */
```

### `/indexing audit`

Goal:

- compare current repo with `AI_INDEX.md`
- report stale, missing, or misleading navigation metadata

Check:

- route files referenced by index still exist
- page/domain paths still exist
- package list still matches workspace
- API/state/map entries still match likely files
- important new folders are not missing
- AGENTS/rules loading still makes sense

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

- update only changed index sections
- avoid rewriting stable sections

Refresh targets:

- routes
- page/domain map
- package/workspace map
- API/data flow
- state management
- map/GIS flow
- first-read files
- maintenance triggers

Output should mention only changed, skipped, and uncertain items.

### `/indexing explain`

Goal:

- explain how current repo indexing works
- list first-read files and rules
- do not modify files

## AI_INDEX Contract

`AI_INDEX.md` is a project adapter.

It should answer:

- What kind of project is this?
- Where should agents start reading?
- Which routes/pages/domains exist?
- Where are API/state/map/test entry points?
- What should future agents avoid scanning?
- When should this index be updated?

It should not:

- duplicate README
- document every folder
- become a historical changelog
- contain long implementation details

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
- AI_INDEX.md: route/page map
- rules/context-navigation.md: added missing read order

Skipped:
- trivial UI components
- generated API files

Uncertain:
- auth domain ownership appears split between ...
```

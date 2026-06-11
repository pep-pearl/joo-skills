# AI_INDEX.md

## Purpose

AI repo navigation map.

Use this to choose minimum files to read before opening large repo areas.

Not architecture doc. Not task prompt. Keep short, factual, path-first.

## Project

- name:
- stack:
- package manager:
- architecture:
- main app:
- shared packages:

## Read Algorithm

1. If user gives exact files, start there.
2. For route/page tasks, start at:
   - `TODO`
3. Map route -> page:
   - `TODO`
4. Follow imports downward.
5. Do not scan the whole repo by default.
6. Check file-level `@ai-*` headers before full file read.

## Workspace

- `TODO`: purpose / entry

## Main Entries

- `TODO`: app bootstrap
- `TODO`: routing
- `TODO`: state
- `TODO`: API client
- `TODO`: test setup

## App Map

- `app`: bootstrap, providers, routes
- `pages`: route-level screens
- `widgets`: reusable large UI blocks
- `features`: user actions/forms/interactions
- `entities`: domain model/pure logic
- `shared`: reusable UI/utils/hooks/store/API

## Domain Map

- `TODO domain`: routes/pages/features/entities/API

## Flows

### Route -> Page

`TODO`

### API Data Flow

`TODO`

### State Flow

`TODO`

## Task Starts

### Route/page task

- start:
- then:

### State task

- start:
- then:

### API task

- start:
- then:

### Styling/UI task

- start:
- then:

## Naming / Conventions

- folders:
- components:
- hooks:
- types:
- tests:

## File-Level AI Header

Important files may include:

```ts
/**
 * @ai-purpose Short file responsibility.
 * @ai-entry true | false
 * @ai-domain routing | api | state | page | feature | entity | shared | config | test
 */
```

Read header first. Open full file only if relevant.

## External Rules

- `rules/context-navigation.md`: minimal file navigation.
- `rules/ai-navigation-maintenance.md`: index/header maintenance.

## Future-Agent Defaults

- Do not full-scan repo.
- Use `AI_INDEX.md` first.
- Prefer import-following over directory browsing.
- Preserve dependency direction.
- Read tests when behavior matters.

## Maintenance Triggers

Update this file when changes affect:

- new/removed/renamed routes or page folders
- route/page mapping
- major feature/domain ownership
- global store shape
- API client/data-fetching architecture
- map/GIS architecture
- monorepo package list
- first-read files for future agents

Do not update for tiny internal implementation changes.

## AI Output Compression

- path-first
- decision-first
- bullets over prose
- omit unchanged sections
- report changed / skipped / uncertain

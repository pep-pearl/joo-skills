# AI Navigation Maintenance Rule

## Purpose

Use this rule only when explicitly asked to create, update, audit, or improve AI navigation metadata.

Also use it after code changes when the change may affect how future AI agents navigate the repository.

AI navigation metadata includes:

- `/AI_INDEX.md`
- file-level `@ai-*` comments
- domain/flow maps
- entry point docs
- rule-loading guidance in `AGENTS.md`

Do not use this rule for normal feature work, bug fixes, styling, or refactors unless repo navigation is affected.

## Update Targets

### Update `AI_INDEX.md` when changes affect:

- routes, pages, or route-to-page mapping
- major feature folders
- domain responsibility
- important flows
- state management
- API/data fetching
- map/GIS architecture
- entry points or first-read files
- files future agents need to understand the project

### Update file-level `@ai-*` comments when:

- file purpose changes
- entry-point status changes
- owning domain changes
- important dependencies or callers change
- the file becomes important for navigation
- existing metadata becomes inaccurate

### Update `AGENTS.md` only when:

- global workflow changes
- rule-loading behavior changes
- common rules are added, moved, renamed, or removed
- repository-wide agent behavior changes

Do not update `AGENTS.md` for ordinary feature implementation.

## File Header Format

Use for TypeScript, JavaScript, and React files:

```ts
/**
 * @ai-purpose Short responsibility.
 * @ai-entry true | false
 * @ai-domain routing | auth | map | gis | ui | api | state | feature | page | entity | shared | config | test
 * @ai-depends Important internal dependencies.
 * @ai-used-by Main callers or areas.
 * @ai-keywords Searchable names: components, hooks, APIs, routes.
 * @ai-notes Important modification notes. Omit if unnecessary.
 */
```

## Header Guidelines

- Keep headers short, factual, and useful for navigation.
- Do not add headers to every file.
- Prefer headers on route files, page entries, providers, stores, API clients, domain services, feature modules, entities, and complex components.
- Skip tiny UI components, constants, assets, generated files, snapshots, lockfiles, and trivial re-exports.
- Do not modify runtime logic.
- Do not reformat unrelated code.
- Preserve license comments and shebangs above AI comments.
- If uncertain, say `likely`, `appears to`, or `추정`.

## Post-Change Check

After code work, briefly decide whether AI navigation metadata needs updates.

```txt
[AI_NAVIGATION_MAINTENANCE_SUMMARY]

Updated:
- ...

AI headers:
- added:
- updated:
- unchanged:

AI_INDEX.md:
- updated:
- unchanged because:

AGENTS.md:
- updated: yes/no
- reason:

Future-agent impact:
- ...

Skipped:
- ...

Uncertain:
- ...
```

## Output Style

- short bullets
- changed/skipped/uncertain only
- no full inventories unless requested
- path + summary instead of large pasted sections

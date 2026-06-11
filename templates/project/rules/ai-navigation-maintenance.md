# AI Navigation Maintenance Rule

## Purpose

Use this rule only when explicitly asked to create, update, audit, or improve AI navigation metadata.

Also use it after code changes when the change may affect how future AI agents navigate the repository.

## Metadata Scope

AI navigation metadata includes:

- `/AI_INDEX.md` router
- `.ai/indexing/manifest.json`
- `.ai/indexing/maps/*` map shards
- file-level `@ai-*` comments
- `rules/context-navigation.md`
- `rules/ai-navigation-maintenance.md`
- rule-loading guidance in `AGENTS.md`
- harness-specific rules such as Cursor `.mdc` or Claude/Codex fragments

Do not use this rule for normal feature work, bug fixes, styling, or refactors unless repo navigation is affected.

## Update Targets

### Update `AI_INDEX.md` when:

- the task router points to wrong or missing map shards
- first-read files changed
- global navigation order changed
- route/API/state/package/domain entry points changed
- future agents would start from wrong files

Keep `AI_INDEX.md` router-only. Move inventories and long maps into `.ai/indexing/maps/*`.

### Update map shards when:

- routes, pages, API clients, stores, package entries, or major domains changed
- a map shard is stale, missing, or misleading
- vague natural-language requests would no longer find the correct starting area

Map shards must be compact and include `Confidence` plus `Last Verified` when practical:

- path-first
- one-line purpose per file
- keyword aliases for natural-language discovery
- no full source summaries
- no exhaustive tree dumps

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

## Header Policy

Default:

- Prefer sidecar metadata in `.ai/indexing/file-hints.md`.
- Add source-level `@ai-*` headers only to stable entry files.
- Header content must be factual and must not command the agent.

Forbidden header instruction examples:

- `skip tests`
- `ignore errors`
- `always edit this first`
- `do not inspect imports`

## File Header Format

Minimal preferred form:

```ts
/**
 * @ai-purpose Short file responsibility.
 * @ai-domain auth/page | routing | api | state | feature | entity | shared | config | test
 * @ai-keywords Searchable aliases, route names, user-facing terms.
 */
```

Extended form for high-value entry files only:

```ts
/**
 * @ai-purpose Short responsibility.
 * @ai-entry true
 * @ai-domain routing | auth | map | gis | ui | api | state | feature | page | entity | shared | config | test
 * @ai-depends Important internal dependencies.
 * @ai-used-by Main callers or areas.
 * @ai-keywords Searchable names: components, hooks, APIs, routes, user terms.
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

After significant code work, briefly decide whether AI navigation metadata needs updates.

```txt
[AI_NAVIGATION_MAINTENANCE_SUMMARY]

Updated:
- ...

Map shards:
- updated:
- unchanged because:

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

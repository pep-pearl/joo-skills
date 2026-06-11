# AI Metadata Maintenance Skill

## Purpose

Keep AI navigation metadata accurate after code changes.

Metadata includes:

- `AI_INDEX.md`
- file-level `@ai-*` headers
- `rules/context-navigation.md`
- `rules/ai-navigation-maintenance.md`
- `AGENTS.md`
- harness-specific rules such as Cursor `.mdc` or Claude skill files

## Use When

- routes changed
- page folders moved
- domain ownership changed
- API/data-fetching architecture changed
- state architecture changed
- map/GIS architecture changed
- important first-read files changed
- user explicitly asks to update AI metadata

## Do Not Use For

- tiny UI copy changes
- internal implementation details
- local refactors that do not affect navigation
- generated files
- formatting-only changes

## Update Rules

### AI_INDEX.md

Update when future agents would otherwise start from wrong files.

### File Headers

Update when file purpose, domain, entry status, dependencies, or main callers changed.

### AGENTS.md

Update only when global workflow or rule loading changed.

## Required Final Check

After significant code work, include:

```txt
AI navigation metadata:
- unchanged because ...
```

or a full maintenance summary if updates were made.

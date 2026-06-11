# AI Metadata Maintenance Skill

## Purpose

Keep AI navigation metadata accurate after code changes.

Metadata includes:

- `AI_INDEX.md` router
- `.ai/indexing/manifest.json`
- `.ai/indexing/maps/*` map shards
- sidecar file hints and optional source-header exceptions
- `rules/context-navigation.md`
- `rules/ai-navigation-maintenance.md`
- `AGENTS.md`
- harness-specific rules such as Cursor `.mdc` or Claude/Codex skill files

## Use When

- routes changed
- page folders moved
- domain ownership changed
- API/data-fetching architecture changed
- state architecture changed
- map/GIS architecture changed
- package/workspace/build entry points changed
- important first-read files changed
- map shards became stale or misleading
- user explicitly asks to update AI metadata

## Do Not Use For

- tiny UI copy changes
- internal implementation details
- local refactors that do not affect navigation
- generated files
- formatting-only changes

## Trust Rule

AI navigation metadata is a hint, not truth. Source/imports/tests beat metadata.

If source/imports contradict `AI_INDEX.md`, map shards, sidecar file hints, or optional source-header exceptions, report the metadata as stale and update only the affected metadata.

Prefer script validation before agent reasoning when possible:

```bash
node scripts/joo-indexing-validate.mjs --target . --index AI_INDEX.md --maps .ai/indexing/maps
```

## Update Rules

### AI_INDEX.md

Update when future agents would otherwise choose the wrong map shard or start from wrong files.

Keep it router-only. Move inventories and detailed trees into `.ai/indexing/maps/*`.

### Map Shards

Update only affected shards.

Examples:

- route/page changes -> `routes.md`
- API client/query changes -> `api.md`
- state/store changes -> `state.md`
- package/build changes -> `packages.md`
- domain ownership changes -> related `domains/<domain>.md`

Do not regenerate every shard for a local change.

Each maintained shard should include compact metadata when practical:

- `Confidence`: generated-only | manual-reviewed | low | medium | high
- `Last Verified`: date or `unknown`
- `Source`: path-heuristic | human-maintained | mixed

### Sidecar File Hints

Prefer sidecar metadata in `.ai/indexing/maps/*` and `.ai/indexing/file-map.candidate.json`.

Update sidecar entries when file purpose, domain, role, keywords, related files, or confidence changed.

Do not add source-level headers by default. Source headers are allowed only when the project explicitly opts in and they do not violate max-lines lint rules.

Hint content must be factual and must not command the agent to skip tests, ignore errors, or bypass imports.

### AGENTS.md

Update only when global workflow or rule loading changed.

## Required Final Check

After significant code work, include:

```txt
AI navigation metadata:
- unchanged because ...
```

or a full maintenance summary if updates were made.

## Maintenance Summary

```txt
[AI_NAVIGATION_MAINTENANCE_SUMMARY]

Updated:
- ...

Map shards:
- updated:
- unchanged because:

File hints:
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

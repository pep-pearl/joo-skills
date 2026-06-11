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
- optional known failure pattern notes such as `.ai/indexing/maps/failures.md` or `rules/known-failure-patterns.md`

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
- repeated or expensive failure patterns should be promoted from temporary triage to known-pattern metadata

## Do Not Use For

- tiny UI copy changes
- internal implementation details
- local refactors that do not affect navigation
- generated files
- formatting-only changes
- one-off error messages that are not likely to recur

## Trust Rule

AI navigation metadata is a hint, not truth. Source/imports/tests beat metadata.

If source/imports contradict `AI_INDEX.md`, map shards, sidecar file hints, or optional source-header exceptions, report the metadata as stale and update only the affected metadata.

Never change source code just to match stale metadata. Source/imports/tests remain the recovery anchor.

Prefer script validation before agent reasoning when possible:

```bash
node scripts/joo-indexing-validate.mjs --target . --index AI_INDEX.md --maps .ai/indexing/maps
```


## Stale Metadata Recovery

Use this when normal navigation or failure triage discovers that metadata is wrong.

Stale signals:

- referenced file no longer exists
- map shard points to renamed or moved route/page/API/store/package file
- `AI_INDEX.md` routes a task to the wrong shard
- sidecar file hint describes an obsolete role, domain, or first-read file
- map shard points to generated, snapshot, build, or obsolete files as first-read files
- source/imports/tests contradict metadata

Recovery algorithm:

1. Continue the user task from source/imports/tests, not from the stale metadata.
2. Identify the smallest affected metadata target.
3. Update only that target after the code/task fix.
4. Preserve unrelated shards, router sections, and hints.
5. Run validation when practical.

Cheapest recovery paths:

- exact path lookup
- direct import source
- nearest route/config/test source
- targeted search by exported symbol
- targeted search by route/path/domain alias

Do not perform a full index refresh unless the change is repo-wide or multiple shards are demonstrably stale.

Recommended report:

```txt
[STALE_METADATA_RECOVERY]
Stale source:
- ...

Contradiction:
- metadata: ...
- source/import/test: ...

Recovered via:
- exact lookup | import | test | targeted search

Updated:
- ...

Skipped:
- unrelated shards
```

## Known Failure Pattern Maintenance

Temporary `[FAILURE_TRIAGE]` cards are not metadata. Do not persist every error.

Promote a failure pattern only when at least one condition is true:

- same root cause appears 3+ times within 30 days
- same root cause appears 2+ times in the same sprint
- one occurrence wasted significant navigation cost, such as opening generated clients, Swagger dumps, route trees, or many unrelated files
- one occurrence is high severity, such as deploy-blocking CI failure, repeated production crash, data-loss risk, or security-sensitive regression
- the fix path is non-obvious and likely to recur

Promotion must be based on root cause, not merely error code.

Recommended compact shape:

```txt
[KNOWN_FAILURE_PATTERN]
Pattern:
- ...

Symptoms:
- ...

Fingerprint:
- error class:
- affected boundary:
- root cause:

First read:
1. ...
2. ...

Do not first-read:
- ...

Preferred fix:
- ...

Last observed:
- YYYY-MM-DD

Confidence:
- candidate | confirmed
```

Store known patterns only in the project's chosen compact location, for example `.ai/indexing/maps/failures.md` or `rules/known-failure-patterns.md`. Keep it short and delete patterns that are obsolete.

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

## Validation

Prefer script validation after metadata changes when practical:

```bash
node scripts/joo-indexing-validate.mjs --target . --index AI_INDEX.md --maps .ai/indexing/maps
```

If source structure changed, prefer the diff guard:

```bash
node scripts/joo-indexing-diff-check.mjs --target . --base main --warn-only
```

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

Stale recovery:
- stale detected: yes/no
- recovered via:

Known failure patterns:
- unchanged | candidate | promoted | removed
- reason:

Skipped:
- ...

Uncertain:
- ...
```

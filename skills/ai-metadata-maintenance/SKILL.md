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



## Diff-Based Maintenance Gate

When source changes already exist, run `npm run diff:impact` before deciding metadata updates. If unavailable, inspect changed files directly.

Preferred script:

```bash
node scripts/joo-diff-impact.mjs --target . --base main
```

Rules:

1. Treat changed files as anchors.
2. Update only metadata targets marked `required`.
3. Inspect changed source/imports/tests before touching targets marked `maybe`.
4. Do not read or regenerate shards marked `skip`.
5. Keep `AI_INDEX.md` changes for first-read, router, or domain ownership changes only.
6. Preserve unrelated shards even when `joo-indexing-diff-check.mjs` warns broadly.

Typical mapping:

- route/page changes -> `maps/routes.md`, `AI_INDEX.md` only when router/first-read changed
- API/query/client changes -> `maps/api.md`
- state/cache/session changes -> `maps/state.md`
- package/build/test config changes -> `maps/packages.md`
- domain ownership or moved domain entry -> `maps/domains/<domain>.md`
- tiny UI/copy/local refactor -> no metadata update

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

Respect the active byte and shard budget. When adding a new entry or shard, compare it with current candidates and evict the lowest unprotected priority-per-byte item rather than expanding indefinitely. Manual pins, recent-error protection, minimum residence, and replacement limits are capacity preferences, but a hard budget still wins unless explicit pinned overflow is enabled.

Priority scoring belongs in deterministic maintenance scripts. Do not ask the runtime agent to read every map or source file just to recompute importance. Maintenance state and priority reports must not be linked from `AI_INDEX.md` as task context.

Each maintained shard should include compact metadata when practical:

- `Confidence`: generated-only | manual-reviewed | low | medium | high
- `Last Verified`: date or `unknown`
- `Source`: path-heuristic | human-maintained | mixed

### Sidecar File Hints

Prefer sidecar metadata in `.ai/indexing/maps/*` and `.ai/indexing/file-map.candidate.json`.

Update sidecar entries when file purpose, domain, role, concern, concrete anchors, keywords, related files, or confidence changed.

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
node scripts/joo-diff-impact.mjs --target . --base main
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


## Known Agent Lesson Maintenance

General agent-behavior lessons are not navigation metadata. Maintain them only when the project explicitly uses a compact file such as `rules/known-agent-lessons.md`.

Revalidate an approved advisory lesson when:

- an anchored file or symbol is missing or renamed;
- the framework, data layer, architecture version, branch family, or deployment environment changed;
- a newer lesson supersedes it;
- repeated retrieval was rejected or irrelevant;
- a shared ownership or contract boundary changed.

Actions:

- `rebind`: update path/symbol when behavior moved;
- `generalize`: keep a higher-level principle after file-specific implementation disappeared;
- `archive`: remove from normal retrieval when the environment no longer applies;
- `supersede`: point to the approved replacement;
- preserve legacy branch applicability when old releases remain supported.

Do not scan every lesson after every change. Validate affected anchors on retrieval or after a clear migration event. Source/imports/tests and current project rules remain truth.

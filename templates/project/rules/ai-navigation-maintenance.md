# AI Navigation Maintenance Rule

## Purpose

Use this rule only when explicitly asked to create, update, audit, or improve AI navigation metadata.

Also use it after code changes when the change may affect how future AI agents navigate the repository.

## Metadata Scope

AI navigation metadata includes:

- `/AI_INDEX.md` router
- `.ai/indexing/manifest.json`
- `.ai/indexing/maps/*` map shards
- sidecar file hints and optional source-header exceptions
- `rules/context-navigation.md`
- `rules/ai-navigation-maintenance.md`
- rule-loading guidance in `AGENTS.md`
- harness-specific rules such as Cursor `.mdc` or Claude/Codex fragments
- optional known failure pattern notes such as `.ai/indexing/maps/failures.md` or `rules/known-failure-patterns.md`

Do not use this rule for normal feature work, bug fixes, styling, or refactors unless repo navigation is affected.

## Capacity and Priority Rule

Treat navigation metadata as a bounded cache. Respect the active `tight`, `balanced`, or `retentive` byte/shard/entry budget. Adding a new entry must not silently grow the index: preserve pinned/recent-error/minimum-residence entries when capacity permits, then evict the lowest unprotected priority-per-byte item.

Priority is computed by scripts from cheap signals. Do not read the whole repository or every map with an LLM to rank importance. Do not link assessment, priority, or local-usage files from `AI_INDEX.md`; runtime agents must not read them during normal work.

Temporary `[FAILURE_TRIAGE]` cards are not metadata. Persist only repeated or expensive root-cause patterns.

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

### Update sidecar file hints when:

- file purpose changes
- entry-point status changes
- owning domain changes
- important dependencies or callers change
- the file becomes important for navigation
- existing metadata becomes inaccurate

### Update known failure patterns when:

- the same root cause appears 3+ times within 30 days
- the same root cause appears 2+ times in the same sprint
- one occurrence caused significant navigation cost
- one occurrence is high severity, such as deploy-blocking CI failure, repeated production crash, data-loss risk, or security-sensitive regression
- the fix path is non-obvious and likely to recur

Do not promote based on error code alone. Promote only when the root cause and preferred first-read path are clear.

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

Do not first-read:
- ...

Preferred fix:
- ...

Last observed:
- YYYY-MM-DD

Confidence:
- candidate | confirmed
```

### Update `AGENTS.md` only when:

- global workflow changes
- rule-loading behavior changes
- common rules are added, moved, renamed, or removed
- repository-wide agent behavior changes

Do not update `AGENTS.md` for ordinary feature implementation.



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

When metadata points to a missing, renamed, moved, or semantically wrong file:

1. Trust source/imports/tests over metadata.
2. Do not force source code to match stale metadata.
3. Recover with the cheapest path: exact lookup, direct import source, nearest route/config/test source, or targeted symbol/path search.
4. Continue the user task from the real source.
5. Update only the affected metadata after the task fix.
6. Do not regenerate unrelated shards.

Recommended note:

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

## Sidecar File Hint Policy

Default:

- Prefer sidecar metadata in `.ai/indexing/maps/*` and `.ai/indexing/file-map.candidate.json`.
- Do not add source-level `@ai-*` headers by default.
- Hint content must be factual and must not command the agent.

Forbidden hint instruction examples:

- `skip tests`
- `ignore errors`
- `always edit this first`
- `do not inspect imports`

## File Hint Format

Use sidecar map entries instead of source comments by default.

```json
{
  "path": "src/pages/order/detail.tsx",
  "role": "route-or-page",
  "scope": "order detail page",
  "domain": "order",
  "keywords": ["order-detail"],
  "related": [],
  "confidence": "manual-reviewed",
  "lastVerified": "YYYY-MM-DD"
}
```

Source-header exception: only when the project explicitly opts in, max 2 short lines, stable entry boundary only, and never when max-lines lint would fail.


## File Hint Guidelines

- Keep sidecar hints short, factual, and useful for navigation.
- Do not add source-level headers by default.
- Prefer hints for route files, page entries, providers, stores, API clients, domain services, feature modules, entities, and complex components.
- Skip tiny UI components, constants, assets, generated files, snapshots, lockfiles, and trivial re-exports.
- Do not modify runtime logic.
- Do not reformat unrelated code.
- If source-header exceptions are enabled, preserve license comments and shebangs above any AI comments.
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

## Output Style

- short bullets
- changed/skipped/uncertain only
- no full inventories unless requested
- path + summary instead of large pasted sections


## PR / CI Guard

When source structure changes, prefer a cheap diff guard before relying on agent reasoning:

```bash
node scripts/joo-diff-impact.mjs --target . --base main
node scripts/joo-indexing-diff-check.mjs --target . --base main --warn-only
```

Use strict mode only after the team agrees that metadata updates are part of done.

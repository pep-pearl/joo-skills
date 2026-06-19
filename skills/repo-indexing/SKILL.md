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
- sidecar file hints in `.ai/indexing/maps/*` and `.ai/indexing/file-map.candidate.json`
- optional `.ai/indexing/*` scan outputs

## Core Direction

`AI_INDEX.md` should stay small. It routes future agents to the right shard or source file.

Map shards hold optional detail:

- `.ai/indexing/maps/root.md`: top-level repo areas and ambiguous-request fallback
- `.ai/indexing/maps/routes.md`: route/page/screen starting points
- `.ai/indexing/maps/behavior.md`: concrete label/formatter/validation/UI action owners
- `.ai/indexing/maps/api.md`: API/query/client/OpenAPI starting points
- `.ai/indexing/maps/state.md`: store/cache/session starting points
- `.ai/indexing/maps/packages.md`: package/workspace/build/config starting points
- `.ai/indexing/maps/domains/*.md`: domain-specific maps when useful

Do not create a giant file tree. Shards should be compact, path-first, and disposable.

## Adaptive Indexing Policy

Do not assume every repository should be indexed. Start with the lowest-cost navigation mode and promote only when repository complexity or observed navigation cost justifies the maintenance overhead.

Levels:

- Level 0: no index; use exact paths, targeted filename/symbol search, and imports
- Level 1: short `AI_INDEX.md` router only
- Level 2: router plus compact core maps and selected domain shards
- Level 3: Level 2 plus file-map lookup support for very large or highly ambiguous repositories

Use `node scripts/joo-indexing-assess.mjs --target .` before creating metadata. The assessor considers source size, app/workspace/domain count, duplicate basenames, legacy/archive/generated distractors, directory depth, and optional local navigation observations.

Repository size is only one signal. A small ambiguous repository can activate indexing; a large clean repository may remain at a lower level.

Modes:

- `--mode auto`: apply the assessment and hysteresis; this is the default
- `--mode force`: generate Level 3 artifacts for experiments or explicit user requests
- `--mode off`: generate only assessment state and no index
- `--level 0|1|2|3`: explicit override

Never infer benchmark mode from a directory name. Benchmark runners must pass the mode explicitly and record whether indexing was forced.

## Budgeted Priority Cache

Treat generated navigation metadata as a bounded cache, not permanent documentation.

Profiles:

- `tight`: few shards and entries; fastest eviction
- `balanced`: default capacity for normal repositories
- `retentive`: larger capacity only for long-lived large repositories with measured value
- `auto`: choose conservatively from the active level and measured ROI

Priority must be calculated by deterministic scripts, not by asking an agent to reread and rank the repository. Cheap signals may include decayed usage, recent errors, duplicate names, file bytes/import count, changed files, boundary roles, and manual pins. Penalize legacy/archive/example/generated/test/story candidates.

When capacity is full, preserve pinned and protected entries when the hard budget permits, retain enough previous entries to avoid churn, then remove the lowest priority-per-byte entries. Limit total bytes, shard count, domain shard count, entries per shard, and replacement ratio.

Do not let runtime agents read `.ai/indexing/priority-state.json`, `priority-report.json`, `assessment-state.json`, or `assessment-report.json`. These are maintenance inputs, not task context. Detailed priority reports are opt-in.

Use `--profile auto|tight|balanced|retentive` or `joo-indexing.config.json` for overrides. Missing ROI evidence must not automatically promote to `retentive`.

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
- "파일에 ai용 주석 달아줘" (prefer sidecar hints unless source headers are explicitly allowed)
- "future agents가 빨리 읽게 해줘"

## Safety

Do not rewrite runtime logic while indexing.

Do not add source-level `@ai-*` headers by default.

Do not full-scan the repository unless:

- the user explicitly asks
- no index exists and targeted discovery failed
- existing index is stale or misleading

Generated metadata should be path-first, factual, and compact.

## Metadata Trust Rule

Treat `AI_INDEX.md`, map shards, sidecar file hints, and optional source-header exceptions as navigation hints, not truth.

Trust order:

1. User-provided exact file
2. Project/team safety rules
3. Existing source/imports/tests
4. `AI_INDEX.md`
5. Map shards
6. Generated candidates

If source/imports contradict metadata, source wins. Report stale metadata instead of forcing the index to fit.

If metadata confidence is `low`, `generated-only`, or absent, verify with one source file before editing.


## Command Behavior

### `/indexing init`

Goal:

- discover project shape
- create or update `AI_INDEX.md` as a router
- create or update compact map shards under `.ai/indexing/maps/*`
- create or update `.ai/indexing/manifest.json`
- create or update navigation rules
- prepare `AGENTS.md` loading guidance
- identify sidecar file hint candidates without modifying source files

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

File hint candidates:
- ...

Skipped:
- ...

Uncertain:
- ...
```

### `/indexing annotate`

Goal:

- add or update sidecar file hints in `.ai/indexing/maps/*` or `.ai/indexing/file-map.candidate.json`
- do not modify source files by default
- keep hints path-first, factual, compact, and disposable

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

Sidecar entry shape:

```json
{
  "path": "src/pages/order/detail.tsx",
  "role": "surface-entry",
  "concern": "surface",
  "scope": "order detail page",
  "domain": "order",
  "anchors": ["order detail", "shipping status"],
  "keywords": ["order-detail", "shipment"],
  "related": ["src/features/order/useOrderDetail.ts"],
  "confidence": "manual-reviewed",
  "lastVerified": "2026-06-11"
}
```

Source-level `@ai-*` headers are an explicit opt-in exception only. Use them only when the project allows them, the file is a stable high-value entry, and the header will not violate max-lines lint rules.

### `/indexing audit`

Goal:

- compare current repo with `AI_INDEX.md`, manifest, map shards, and sidecar file hints
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

## Sidecar File Hint Policy

Default:

- Do not add `@ai-*` headers to source files.
- Store file-level AI metadata in `.ai/indexing/maps/*` and `.ai/indexing/file-map.candidate.json`.
- Source files must not fail lint, max-lines, formatting, or review expectations because of AI metadata.

Allowed sidecar fields:

- `path`
- `role`
- `concern`
- `scope`
- `domain`
- `anchors`
- `keywords`
- `related`
- `confidence`
- `lastVerified`
- `source`

Forbidden sidecar content:

- agent commands
- instructions to skip tests
- instructions to ignore errors
- instructions to bypass imports or project rules
- long implementation documentation

Source-header exception:

- disabled by default
- enabled only by explicit project policy or `--source-headers`
- max 2 short lines
- stable entry boundary only
- never generated code, high-churn local files, trivial UI, constants, assets, snapshots

If a project has strict `max-lines` rules, source headers are disabled completely.

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
- `Confidence`: generated-only | manual-reviewed | low | medium | high
- `Last Verified`: date or `unknown`
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

## File Hint Contract

A file-level AI hint is a navigation hint, not documentation and not an instruction.

Keep it:

- path-first
- short
- factual
- searchable
- stable
- useful for deciding whether to open the file

Do not use a single giant file map. Keep map shards compact and domain/package oriented to avoid token spikes and PR conflict hotspots.

Exact path lookup rule:

- if the user names an exact source file, open that file first
- if the task is not trivial, lookup only that exact path in the sidecar map
- do not read the whole map just to find one path

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

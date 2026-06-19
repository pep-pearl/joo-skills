# Adaptive, Budgeted Priority Indexing

This policy prevents AI navigation metadata from becoming more expensive than direct source navigation.

The index is treated as a **bounded navigation cache**, not permanent documentation. Repository assessment decides whether indexing should exist; budget profiles decide how much may be kept; priority scoring decides which entries survive when the budget is full.

## Indexing levels

| Level | Generated navigation metadata | Intended use |
| --- | --- | --- |
| 0 | assessment only | small, clean, unambiguous repositories |
| 1 | compact `AI_INDEX.md` candidate | several areas, but direct search is still cheap |
| 2 | router, bounded core maps, selected domain maps | medium or ambiguous repositories |
| 3 | Level 2 plus compact file-map lookup metadata | very large or highly repetitive repositories |

Size alone never decides activation. The assessor combines source files/LOC/bytes, workspaces, applications, domains, duplicate basenames, distractor trees, directory depth, and optional observed navigation cost.

## Budget profiles

| Profile | Typical purpose | Default behavior |
| --- | --- | --- |
| `tight` | small repo or strict token budget | few shards, few entries, fast eviction |
| `balanced` | normal default | moderate shard and byte budgets |
| `retentive` | large long-lived monorepo with proven ROI | more shards and longer retention |
| `auto` | recommended | selects conservatively from level and measured ROI |

`auto` does **not** choose `retentive` merely because Level 3 is active. It requires measured strong ROI. Poor measured ROI forces `tight`; missing ROI evidence stays conservative.

```bash
npm run scan                 # auto level + auto budget profile
npm run scan:tight
npm run scan:balanced
npm run scan:retentive
npm run scan:force           # Level 3 experiment; budget still applies
```

Direct CLI:

```bash
node scripts/joo-indexing-scan.mjs \
  --target . \
  --out .ai/indexing \
  --mode auto \
  --profile balanced
```

## Priority signals

Priority is calculated by deterministic Node code. No LLM is used to score every file.

Signals include:

- decayed local usage frequency
- recency of use
- duplicate basename ambiguity
- cheap complexity proxies: file bytes and import count
- recent error/failing-test observations
- current changed-file membership when `--changed-since` is used
- boundary role: behavior owner, state/data boundary, surface, route, config
- previous selection stability
- manual path/domain/concern pins
- penalties for legacy/archive/example/playground/generated/test/story files

The error signal is a cheap **risk proxy**, not a claim to predict true failure probability.

## Eviction and stability

Each selected entry has a priority and estimated index-byte cost. Candidates are ordered primarily by:

```txt
priority density = navigation priority / estimated index bytes
```

When new candidates arrive and a shard budget is full:

1. manual pins are considered first;
2. recent-error and minimum-residence entries are protected when capacity allows;
3. a configured fraction of previously selected entries is retained to prevent churn;
4. remaining capacity is assigned by priority density;
5. low-priority or oversized entries are dropped;
6. only the highest-utility shards and domains are emitted.

Profiles also define:

- maximum total navigation bytes
- maximum shard count and domain-shard count
- maximum entries and bytes per shard
- add/remove thresholds
- minimum residence days
- recent-error protection days
- maximum replacement ratio per refresh

Generated map headings and fixed metadata reserve are accounted for before entries are selected.

## Configuration

Create `joo-indexing.config.json` or `.joo-indexing.json`. A complete example is in `examples/indexing/joo-indexing.config.example.json`.

```json
{
  "$schema": "./schemas/indexing-budget-config.schema.json",
  "schemaVersion": 1,
  "profile": "auto",
  "pins": {
    "domains": ["auth", "checkout"],
    "paths": ["packages/session/src/logout.ts"],
    "concerns": ["security", "session"]
  },
  "profiles": {
    "balanced": {
      "maxTotalBytes": 100000,
      "maxShards": 8,
      "maxDomainShards": 3,
      "maxEntriesPerShard": 28
    }
  },
  "policy": {
    "hardBudget": true,
    "allowPinnedBudgetOverflow": false,
    "autoShrinkOnPoorRoi": true,
    "recordPriorityDetails": false
  }
}
```

`allowPinnedBudgetOverflow` is off by default. A pin therefore improves selection priority but does not silently destroy the hard capacity limit.

## Local observations and ROI

Local observations are optional and must not contain full prompts or source text.

```bash
npm run observe:navigation -- \
  --commands 9 \
  --tool-output-chars 18000 \
  --broad-search \
  --wrong-candidates 2 \
  --domain checkout \
  --concern validation \
  --file apps/storefront/src/features/coupon/ui/CouponField.tsx \
  --error \
  --index-used \
  --saved-chars 12000 \
  --index-read-chars 1800 \
  --maintenance-chars 400
```

The following local files are not normal agent context and should not be read during development tasks:

- `.ai/indexing/local-usage.json`
- `.ai/indexing/priority-state.json`
- `.ai/indexing/assessment-state.json`
- `.ai/indexing/priority-report.json`
- `.ai/indexing/assessment-report.json`

`priority-state.json` exists only to implement minimum residence and replacement limits. `priority-report.json` is disabled by default and can be enabled for maintenance diagnostics.

ROI evidence uses explicitly recorded character-equivalent benefits and costs. It does not pretend to infer precise model tokens.

- strong evidence: permits `auto` to use `retentive` at Level 3
- mixed or absent evidence: keeps `balanced` or `tight`
- repeatedly poor evidence: selects `tight` and prevents expansion

## Token-overhead safeguards

- Level 0 exits immediately after assessment.
- LOC is estimated from at most 200 sampled source files.
- file complexity analysis is capped by profile.
- normal agents read only `AI_INDEX.md`, one shard, or a narrow lookup result.
- maintenance reports are explicitly excluded from runtime navigation.
- detailed file-hint Markdown is opt-in with `--detailed-hints`.
- file-map JSON is compact, flat, and byte-capped.
- map entries are emitted once rather than duplicated in “first read” and “full map” sections.
- stale generated map files are removed before regeneration.
- navigation bytes and maintenance bytes are reported separately.

## Benchmark separation

```bash
npm run benchmark -- --runner codex --model "MODEL" --indexing-mode force
```

- `force`: measures index efficacy independently of fixture size
- `auto`: measures the end-to-end activation and budget decision
- `off`: no-index control
- `npm run benchmark:activation`: deterministic Level 0-3 policy test
- `npm run test:budget`: deterministic profile, scoring, eviction, stability, and ROI test

The model A/B report records requested mode, recommended auto level, actual level, forced status, and the curated indexed-overlay byte size. Budget profile and budget-exceeded checks come from `assessment-report.json` and `npm run test:budget`, because the efficacy fixture intentionally uses a fixed curated overlay. Never infer benchmark mode from a directory name.

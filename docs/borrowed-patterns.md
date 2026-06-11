# Borrowed Patterns

This repo is original personal workflow material, but it intentionally learns from public agent tooling patterns.

## Aider-style Repo Map

Useful idea:

- repo-wide map is cheaper than reading every file
- symbol definitions and signatures are enough for many navigation decisions
- tree-sitter or similar parsers can improve map quality

Local adaptation:

- `joo-indexing-scan.mjs` creates a lightweight candidate map without dependencies
- future version may add optional tree-sitter extraction

## Serena-style Semantic Navigation

Useful idea:

- code agents work better with IDE-like symbol tools
- references, definitions, and relations beat blind text search

Local adaptation:

- skill instructions prefer symbol-aware tools when available
- scripts stay optional and dependency-light

## Repomix-style AI-friendly Packing

Useful idea:

- code context should be packaged intentionally
- ignore generated/noisy files
- produce AI-readable summaries

Local adaptation:

- scan output goes to `.ai/indexing`
- generated candidates are compact and reviewable

## Superpowers-style Composable Skills

Useful idea:

- skills should be small, composable, and loaded by initial instructions
- the agent should use the right skill automatically

Local adaptation:

- each skill has `SKILL.md`
- `AGENTS.md` decides when each skill loads

## oh-my-codex-style Command Workflows

Useful idea:

- command names like `$deep-interview` make workflows easy to invoke
- durable project state helps long-running tasks

Local adaptation:

- `/indexing init|annotate|audit|refresh`
- `.ai/indexing/*` stores candidate output and reports

## License Note

Do not copy implementation code from external projects into this repo unless the license allows it and attribution is preserved.

This repo should keep borrowed material at the level of:
- ideas
- workflow patterns
- compatibility notes
- optional integration guidance

## Sharded Navigation Map

Useful idea:

- a single repo map can become too large to read by default
- a small router plus focused shards keeps normal tasks cheap
- vague natural-language tasks need a different fallback than exact code tasks

Local adaptation:

- `AI_INDEX.md` stays router-only
- `.ai/indexing/maps/*` holds optional detail
- agents should read at most one shard before source files

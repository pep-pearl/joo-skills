# Repo Indexing Commands

These command names are meant for Codex, Claude Code, Cursor, OpenCode, or any chat-based coding agent.

## `/indexing init`

Initialize AI navigation metadata for the current repository.

Expected behavior:

1. Read existing project instructions.
2. Detect project shape.
3. Generate or update:
   - `AI_INDEX.md` router
   - `.ai/indexing/manifest.json`
   - `.ai/indexing/maps/*` compact map shards
   - `rules/context-navigation.md`
   - `rules/ai-navigation-maintenance.md`
   - `AGENTS.md` fragment
4. Propose sidecar file hint candidates.
5. Do not change runtime logic.
6. Do not create a giant file tree.

## `/indexing annotate`

Add or update sidecar file hints without modifying source files by default.

Rules:

- important files only
- no generated files
- no trivial components
- no runtime logic changes
- keep source files unchanged unless source headers are explicitly enabled
- prefer sidecar fields: path, role, concern, scope, domain, anchors, keywords, related, confidence, lastVerified
- use extended fields only when they save future reads

## `/indexing audit`

Check whether navigation metadata is stale.

Check `AI_INDEX.md`, manifest, map shards, rules, and sidecar file hints.

Do not edit unless user asks.

## `/indexing refresh`

Update stale sections only.

Prefer affected shard patches over full rewrites.

## `/indexing explain`

Explain current project navigation metadata to the user.

Mention router, map shards, first-read files, and fallback behavior.

## `/lookup path` / `/lookup keyword`

Lookup exact path, keyword, intent, or domain in sidecar metadata without reading whole map shards.

Expected behavior:

1. Prefer `scripts/joo-indexing-lookup.mjs` when available.
2. Return the smallest likely next-read files.
3. Do not treat lookup metadata as truth; verify source before editing.
4. If no match is found, use targeted search instead of reading every shard.

## `/diff impact` / `/diff review` / `/diff fix-plan`

Use `pr-diff-impact` for already-changed code before normal repo navigation.

Expected behavior:

1. Prefer `scripts/joo-diff-impact.mjs` when available.
2. Start from changed files, staged files, or `main...HEAD`.
3. Read exact changed files before `AI_INDEX.md` routing.
4. Follow direct imports and matching tests only when needed.
5. Return required/maybe/skipped metadata shards.
6. Do not auto-refresh metadata unless the user asked.

## `/diff-check`

Check whether changed source files likely require AI navigation metadata updates.

Expected behavior:

1. Prefer `scripts/joo-indexing-diff-check.mjs --warn-only` in local/PR review.
2. Report affected map shards such as routes, API, state, packages, or domains.
3. Do not auto-refresh unless the user asked.

## `/benchmark navigation`

Measure representative navigation cases against current metadata.

Expected behavior:

1. Read `.ai/indexing/benchmarks/navigation-cases.json` if present.
2. Use lookup to surface expected entry files.
3. Report pass/warn/fail, first hit position, forbidden starts, and average score.

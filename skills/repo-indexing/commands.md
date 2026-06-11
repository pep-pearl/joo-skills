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
4. Propose sparse `@ai-*` header candidates.
5. Do not change runtime logic.
6. Do not create a giant file tree.

## `/indexing annotate`

Add or update sparse file-level AI headers.

Rules:

- important files only
- no generated files
- no trivial components
- no runtime logic changes
- preserve license/shebang comments above AI header
- prefer minimal `@ai-purpose`, `@ai-domain`, `@ai-keywords`
- use extended fields only when they save future reads

## `/indexing audit`

Check whether navigation metadata is stale.

Check `AI_INDEX.md`, manifest, map shards, rules, and sparse headers.

Do not edit unless user asks.

## `/indexing refresh`

Update stale sections only.

Prefer affected shard patches over full rewrites.

## `/indexing explain`

Explain current project navigation metadata to the user.

Mention router, map shards, first-read files, and fallback behavior.

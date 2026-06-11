# PR Diff Impact Commands

These command names are meant for Codex, Claude Code, Cursor, OpenCode, or any chat-based coding agent.

## `/diff impact`

Classify changed files and produce a minimal impact/read plan.

Expected behavior:

1. Prefer `scripts/joo-diff-impact.mjs` when available.
2. Start from changed files, staged files, PR files, or `main...HEAD`.
3. Report changed file roles and affected route/API/state/package/domain boundaries.
4. Return `Read next`, `Skip`, and `AI metadata` sections.
5. Do not read all map shards.
6. Do not auto-refresh metadata unless the user asked.

Useful local commands:

```bash
npm run diff:impact
npm run diff:impact:staged
npm run diff:impact:json
```

## `/diff review`

Review an existing diff without full repo exploration.

Expected behavior:

1. Read exact changed files first.
2. Follow direct imports only when changed code crosses a boundary.
3. Read matching tests only when behavior or regression risk matters.
4. Review generated files only if the generated boundary itself changed.
5. Report stale metadata risk separately from source review.

Useful local command:

```bash
npm run diff:review
```

## `/diff fix-plan`

Create a minimal repair plan for an existing diff.

Expected behavior:

1. State the problem hypothesis from changed files.
2. Name exact patch targets.
3. Include targeted verification.
4. Decide whether AI metadata is unchanged, required, or maybe.
5. Do not implement unless the user also asked for code changes.

Useful local command:

```bash
npm run diff:fix-plan
```

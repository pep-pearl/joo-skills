# Agent Operating Loop Skill

## Purpose

Give coding agents a durable loop for non-trivial tasks.

## When To Use

- multi-file changes
- uncertain requirements
- refactors
- screen implementation
- API integration
- bug fixes requiring investigation

## Loop

1. Clarify only if required.
2. If code is already changed, run or mentally apply `/diff impact` before normal repo navigation.
3. Read minimal files.
4. State assumptions.
5. Make small plan.
6. Execute in slices.
7. Verify each slice.
8. Review changed files.
9. Decide AI metadata maintenance.
10. Summarize changed/skipped/uncertain.

## Diff-Aware Review

When a task starts from an existing PR, staged files, or working-tree changes:

- Start from changed files instead of `AI_INDEX.md`.
- Use `/diff impact` to decide read-next, skip, and metadata targets.
- Review direct imports and matching tests before unrelated shards.
- Use `ai-metadata-maintenance` only for required/maybe targets.

## Write Safety Contract

Before editing source files:

- Name the exact files you intend to edit.
- Do not delete, rename, or move files unless the user explicitly requested it.
- Do not edit generated files, lockfiles, snapshots, build outputs, `.env*`, secret files, credential files, or private config unless explicitly requested.
- Do not run repo-wide replace or broad codemods unless the user asked for a repo-wide change and the matched files were reviewed.
- If AI metadata conflicts with source code, source/imports/tests win. Do not change runtime logic to match stale metadata.
- Prefer the smallest behavior-preserving change.

After editing:

- List changed files.
- State what was verified.
- State tests/checks run, or why they were skipped.
- State whether `AI_INDEX.md` or map shards need updates.

## Task Ledger

For large tasks, maintain:

```txt
[Task Ledger]
Goal:
Constraints:
Files read:
Files changed:
Verification:
Open risks:
Next:
```

## Guardrails

- Do not promise background work.
- Do not ask for confirmation if enough information exists and the change is safe.
- Do not over-refactor.
- Do not rename/delete/move files unless explicitly requested.
- Do not edit generated, lock, snapshot, build, env, secret, credential, or private config files unless explicitly requested.
- Do not hide uncertainty.
- Prefer partial useful completion over waiting for perfect information.

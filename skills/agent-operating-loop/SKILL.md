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
2. Read minimal files.
3. State assumptions.
4. Make small plan.
5. Execute in slices.
6. Verify each slice.
7. Review changed files.
8. Decide AI metadata maintenance.
9. Summarize changed/skipped/uncertain.

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
- Do not hide uncertainty.
- Prefer partial useful completion over waiting for perfect information.

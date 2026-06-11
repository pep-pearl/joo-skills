# Repo Navigation Skill

## Purpose

Choose the minimum file set needed for a development task.

## When To Use

Use before editing code in an unfamiliar or medium/large repository.

## Read Algorithm

1. If user provides exact files, start there.
2. Otherwise read `rules/context-navigation.md` if present.
3. Read `AI_INDEX.md` if present.
4. Identify:
   - domain
   - entry point
   - likely route/page
   - state/API dependencies
   - relevant tests
5. Follow imports downward.
6. Prefer targeted search over directory scans.
7. Broader search only if:
   - index is missing
   - index is stale
   - import-following is blocked
   - task truly requires cross-repo audit

## Output

```txt
Read:
- path: reason

Next:
- path: reason

Skipped:
- broad scan: why unnecessary

Uncertain:
- ...
```

## Principles

- Exact files beat index.
- Index beats search.
- Imports beat directory browsing.
- Tests are read when behavior matters.
- Never read generated or huge files unless needed.

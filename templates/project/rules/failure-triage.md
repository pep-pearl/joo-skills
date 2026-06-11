# Failure Triage Rule

## Purpose

Use this rule when the task starts from an error message, failing test, CI/build failure, stack trace, TypeScript/lint error, or browser/runtime exception.

The goal is to convert failure output into a minimal temporary read plan before opening repository files.

## Core Rule

When an error log is provided, create a temporary failure routing card before reading or editing files.

Error anchors beat repo maps. File/line beats keyword search. Source/imports/tests beat AI metadata.

## Priority

1. User's explicit instruction
2. Nearest project/team safety rules
3. Exact files named by the user
4. Error anchors from logs/tests/stack frames/file lines/commands
5. Existing source/imports/tests
6. `/AI_INDEX.md`
7. `.ai/indexing/maps/*`
8. Targeted search
9. Broad search

Do not start with broad or keyword search when a reliable error anchor exists.

## Temporary Failure Card

Before opening repo files, produce:

```txt
[FAILURE_TRIAGE]
Command:
- ...

Failure type:
- typescript | lint | unit-test | e2e | build | runtime | package-manager | unknown

Error anchors:
- path:line:column, test name, topmost userland stack frame, package/script, route, operation name

Primary read:
1. ...

Follow only if needed:
2. ...
3. ...

Do not read yet:
- generated clients/schema dumps
- full feature/domain directory
- full route tree
- broad keyword search

Likely cause:
- ...

Verification:
- rerun the smallest command that reproduces the failure
```

## Read Order

1. Extract exact anchors from the error text.
2. Prefer the topmost userland stack frame over framework/internal frames.
3. Read the primary file around the failing line or failing test.
4. Follow only direct imports, props, callers, mappers, fixtures, or test setup needed to explain the failure.
5. Use `/AI_INDEX.md` or one map shard only if the error anchor does not identify the repo area.
6. Use targeted search only when no reliable anchor exists or the anchor is stale.
7. Use broad search only after anchored reads, imports, tests, lookup, and targeted search fail.

## Generated / Large File Boundary

Generated, snapshot, build output, lockfile, and schema dump files are never first-read files.

If the failure points into generated output, first read the human-owned boundary:

- wrapper API/client
- adapter/mapper
- query/mutation hook
- schema validator
- component props or form schema
- build/config entry that invokes generation

Open only the exact generated type, operation, enum, or stack slice when needed.

## Known Failure Pattern Promotion

The failure card is temporary by default. Do not persist every error.

Promote a root-cause pattern to a compact known-pattern note only when at least one condition is true:

- same root cause appears 3+ times within 30 days
- same root cause appears 2+ times in the same sprint
- one occurrence caused significant navigation cost
- one occurrence is high severity, such as deploy-blocking CI failure, repeated production crash, data-loss risk, or security-sensitive regression
- the fix path is non-obvious and likely to recur

Do not promote based on error code alone. Promote based on root cause.

## Stale Metadata Interaction

If error anchors or AI metadata point to missing, moved, renamed, or semantically wrong files:

1. Trust source/imports/tests.
2. Mark the metadata as stale.
3. Recover using exact lookup, direct import source, failing test source, or targeted symbol/path search.
4. Continue fixing the real failure.
5. After the code fix, update only affected metadata when metadata maintenance is in scope.

Never force code to match stale AI metadata.

## Output

After fixing, include:

```txt
Failure triage:
- anchor used:
- files read:
- avoided:
- verification:
- known-pattern promotion: no | candidate | promoted, reason

AI navigation metadata:
- unchanged because ...
```

or include a metadata maintenance summary if stale metadata was updated.

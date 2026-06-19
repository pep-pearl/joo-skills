# Failure Triage Skill

## Purpose

Convert an error message, failing test output, stack trace, CI log, type-check failure, or build failure into a minimal temporary read plan before opening repository files.

This skill prevents token waste by using error anchors as the first router. Error anchors beat `AI_INDEX.md`, map shards, and keyword search.

## When To Use

Use when the user provides or references:

- runtime error
- stack trace
- failing test output
- CI/build failure
- TypeScript/lint error
- browser console error
- package manager or bundler failure
- screenshot/text of an exception

Also use when a coding task starts from "fix this error", "tests are failing", "build is broken", or equivalent wording.

## Do Not Use For

- normal feature work without an error signal
- broad codebase audits
- planned refactors where no failure is present
- security incident response that has stronger local rules

## Priority

Failure evidence is a runtime navigation signal.

Priority order when an error is present:

1. User's explicit instruction
2. Nearest project/team safety rules
3. Exact files named by the user
4. Error anchors from logs, tests, stack frames, file/line, command, package name
5. Existing source/imports/tests
6. `AI_INDEX.md`
7. Map shards
8. Targeted search
9. Broad search

Do not start with keyword search when a reliable file, line, test name, command, package, or userland stack frame exists.

## Triage Algorithm

Before reading or editing repository files, produce a temporary card:

```txt
[FAILURE_TRIAGE]
Command:
- ...

Failure type:
- typescript | lint | unit-test | e2e | build | runtime | package-manager | unknown

Error anchors:
- path:line:column, test name, stack frame, package/script, operation name

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

Then proceed in this order:

1. Extract exact anchors from the error text.
2. Prefer the topmost userland frame over framework/internal frames.
3. Read the primary file around the failing line or test.
4. Follow only the direct import, prop, caller, mapper, fixture, or test setup chain needed to explain the failure.
5. Use `AI_INDEX.md` or one map shard only if the error anchor does not identify the repo area.
6. Use targeted search only if no reliable anchor exists or the anchor is stale.
7. Use broad search only after exact anchors, imports, tests, lookup, and targeted search fail.

## Error Anchor Rules

Good anchors:

- `src/path/file.tsx:42:12`
- failing test name or spec path
- topmost userland stack frame
- package script such as `pnpm --filter web test`
- route path or URL from the failure
- API operation name from an integration error
- exported symbol named in a type error

Weak anchors:

- common words such as `status`, `name`, `data`, `id`, `type`, `error`
- framework internals
- bundled or minified output
- generated files
- large snapshots or fixtures

When both weak and strong anchors exist, ignore weak anchors until the strong path is checked.

## Generated / Large File Boundary

Generated files are never first-read files.

If the failure points into generated output, identify the human-owned boundary first:

- wrapper API/client file
- adapter/mapper
- query/mutation hook
- schema validator
- component props or form schema
- build/config entry that invokes generation

Read only the exact generated type, operation, enum, or stack slice when the human-owned boundary requires it. Do not open the whole generated client, schema dump, snapshot, build output, or lockfile.

## Temporary vs Persistent Failure Metadata

The `[FAILURE_TRIAGE]` card is temporary by default. Do not create `.ai/indexing/maps/errors.md` for every failure.

Persist only repeated or expensive root-cause patterns in a compact known-pattern section or sidecar map chosen by the project, for example `.ai/indexing/maps/failures.md` or `rules/known-failure-patterns.md`.

Promote a failure pattern only when at least one condition is true:

- same root cause appears 3+ times within 30 days
- same root cause appears 2+ times in the same sprint
- one occurrence wasted significant navigation cost, such as opening generated clients, Swagger dumps, route trees, or many unrelated files
- one occurrence is high severity, such as deploy-blocking CI failure, repeated production crash, data-loss risk, or security-sensitive regression
- the fix path is non-obvious and likely to recur

Do not promote based on error code alone. Promote based on root cause.

Example fingerprint:

```txt
[KNOWN_FAILURE_PATTERN]
Pattern:
- API response nullable field is passed directly into required UI props

Symptoms:
- TS2322
- `string | undefined` not assignable to `string`
- form defaultValues mismatch

First read:
1. form schema or component props
2. API adapter/mapper
3. exact generated response type only

Do not first-read:
- full generated OpenAPI client
- full feature/domain directory

Preferred fix:
- normalize nullable response at the adapter/mapper boundary
- avoid scattering fallback values in page components
```

## Stale Metadata Interaction

If the error anchor or existing AI metadata points to a missing, moved, renamed, or semantically wrong file:

1. Treat the source/import/test evidence as truth.
2. Mark the navigation metadata as stale.
3. Recover with the cheapest path:
   - exact path lookup
   - direct import source
   - nearest test/spec source
   - targeted search by exported symbol
   - targeted search by route/path/domain alias
4. Continue fixing the user-visible failure from the real source.
5. After the code fix, update only the affected metadata if the task scope allows metadata maintenance.

Never force source changes to match stale AI metadata.

## Read Budget

Default before the first edit:

- error log: provided text only
- map shards: 0
- source files: 1-3
- generated files: 0 unless exact generated slice is required
- tests: failing test/spec first
- broad search: no

Hard cap before first edit:

- map shards: 1, only when anchors are missing or stale
- source files: 5
- generated slices: 1 exact operation/type/symbol
- broad search: only when all anchored paths fail

## Output

When using this skill, briefly show the triage card before the fix plan unless the user requested only a terse patch.

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

## Principles

- Error anchors beat repo maps.
- File/line beats keyword search.
- Topmost userland frame beats framework/internal frames.
- Source/imports/tests beat AI metadata.
- Generated files are never first-read files.
- Triage cards are temporary by default.
- Promote repeated patterns by root cause, not error code.
- Fix the failure first; update only affected metadata afterward.


## Feedback Compound Interaction

Use `failure-triage` for the technical cause of tests, build, runtime, type, lint, or CI failures. Use `feedback-compound` separately when the agent also violated an explicit instruction, file boundary, required abstraction, or user preference. Do not turn a technical error into a user-feedback lesson unless the expectation mismatch is independently verified.

# Context Navigation Rule

## Purpose

Minimize context use during normal dev tasks.

Use this rule to find the right files to read.

Do not use it to create/update AI navigation metadata.

## Read Order

1. User-provided exact files.
2. `/AI_INDEX.md`.
3. File-level `@ai-*` headers.
4. Relevant source files.
5. Relevant tests.
6. Broader search only if needed.

## Navigation Rules

- If user names files, start there.
- Otherwise read `/AI_INDEX.md` first.
- Use `/AI_INDEX.md` to identify:
  - domain
  - flow
  - entry points
  - minimum file set
- Check `@ai-*` headers before full file reads.
- Read full files only when directly relevant.
- Prefer targeted search over broad scans.
- Do not scan the whole repo unless:
  - task explicitly requires it
  - `/AI_INDEX.md` is missing
  - `/AI_INDEX.md` is stale or misleading

## Missing / Stale Index

If `/AI_INDEX.md` is missing or stale:

1. Mention it briefly.
2. Continue with the smallest targeted search possible.
3. Do not create or update AI navigation metadata unless the user asked for it.

## Output Style

When reporting navigation work:

- Keep it short.
- Mention only files read, reason, and next target.
- Avoid full directory inventories.
- Prefer path-first bullets.
- Do not restate unchanged index content.

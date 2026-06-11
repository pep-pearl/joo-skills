# Screen Spec Alignment Skill

## Purpose

Implement or audit frontend screens against official screen specs such as PDF, HTML prototype, design export, or image references.

## When To Use

- user references screen spec
- user asks for UI alignment
- user asks to audit implemented screen against official spec
- user asks to connect page/function/component to spec pages

## Read Order

1. user-provided exact spec pages/files
2. project index
3. route/page entry
4. current implementation
5. component parts
6. state/API/mock data
7. stories/tests
8. broader search only if spec mapping is unclear

## Alignment Checklist

- route exists
- page title/menu label matches
- layout zones match
- table/card/filter fields match
- empty/loading/error states exist
- modal/drawer flow matches
- interaction order matches
- validation message and field naming match
- API availability classified:
  - `real-api`
  - `dummy-wired`
  - `backend-pending`
  - `deferred`

## Output

```txt
Aligned:
- ...

Mismatch:
- spec page / current file / fix

Pending:
- backend-pending:
- spec-unclear:
```

## Rules

- Do not block UI alignment because backend is pending.
- Mark dummy data clearly.
- Prefer small page-local component splits.
- Update AI_INDEX when new route/page/flow matters for future agents.

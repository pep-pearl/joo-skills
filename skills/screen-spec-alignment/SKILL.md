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

## Conditional Quality Checks

Run only when visible in the spec, named by the user, or likely to affect the current screen.

- accessibility:
  - keyboard path
  - focus after modal/drawer open
  - aria label for icon-only controls
- responsive:
  - breakpoint explicitly shown in spec
  - table/card layout changes
- permission:
  - hidden/disabled actions
  - role-specific menu or CTA
- locale:
  - date/time
  - number/currency
  - timezone
- analytics:
  - only if project has existing tracking pattern imported by the flow

Do not broaden search for these checks. Use current file imports first.

## Output

```txt
Aligned:
- ...

Mismatch:
- spec page / current file / fix

Pending:
- backend-pending:
- spec-unclear:

Conditional checks:
- checked:
- skipped:
```

## Rules

- Do not block UI alignment because backend is pending.
- Mark dummy data clearly.
- Keep dummy fallback behind API/domain layer.
- Prefer small page-local component splits.
- Update AI_INDEX when new route/page/flow matters for future agents.

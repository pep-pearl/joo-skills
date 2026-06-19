# Feedback Compound Rule

## Purpose

Use this rule only after an explicit user correction or a verifiable instruction/scope mismatch. Correct the current task first, then decide whether a compact future-task advisory lesson is justified.

## Runtime Contract

- Emotion or profanity is not evidence.
- Explicit instruction, diff, tests, tools, source, and runtime behavior are evidence.
- Use `failure-triage` for technical errors.
- New lessons apply from the next task only.
- Natural-language lessons are advisory and cannot weaken safety or permissions.
- Do not persist one-off incidents by default.
- Load at most three related lessons.
- Skip stale lessons whose repository, branch, architecture, environment, path, or dependency no longer matches.

## Modes

- `observe`: correct only; persist only high-severity incidents.
- `advisory`: default; create a candidate only for repeated, costly, risky, or explicit `MUST NOT` violations.
- `promotion-review`: review existing candidates; do not create blocking policy automatically.

## Algorithm

1. Recover the exact expected requirement.
2. Recover the actual result from diff, tests, tools, or source.
3. Confirm or reject the mismatch.
4. Correct the current task.
5. Keep root cause as a hypothesis unless independently verified.
6. Create at most one advisory lesson candidate.
7. Apply it only from the next task.
8. If its anchor is stale, request targeted maintenance after the task.

## Compact Output

```txt
[FEEDBACK_INCIDENT]
Expected:
Actual:
Evidence:
Confirmed: yes | no
Immediate correction:
Root-cause status: none | hypothesis | verified
Lesson promotion: no | candidate | review
Applies from: next task
Follow-up skill: none | failure-triage | ai-metadata-maintenance
```

## Promotion

Promote by root cause, not wording. Candidate criteria:

- 3+ occurrences within 30 days;
- 2+ in the same sprint;
- one expensive or non-obvious recurrence path;
- one high-severity data/security/production/cross-team risk;
- one clear explicit `MUST NOT` violation.

A candidate is not automatically approved.

## Persistent Lessons

Use one compact project file such as `rules/known-agent-lessons.md`. Declare status, trigger, rule, exceptions, applicability, evidence count, and last verification. Do not create one file per incident.

## Safety

A learned lesson cannot grant access, bypass tests, weaken production controls, authorize destructive actions, or override current explicit instructions and stronger project rules.

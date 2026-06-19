# Verified Feedback Compound — Design and Adoption Report

## Design personas

This design is reviewed through five complementary personas:

1. **AI agent platform architect** — composability, contracts, and lifecycle boundaries.
2. **Developer experience engineer** — low-friction adoption, understandable commands, and escape hatches.
3. **SRE / reliability engineer** — deterministic controls, reproducibility, and incident safety.
4. **Security and privacy reviewer** — memory poisoning, permissions, sensitive data, and retention.
5. **Lean skeptical staff engineer** — YAGNI, measurable ROI, and prevention of meta-system overgrowth.

No single persona owns the final decision. The implemented design is the smallest overlap that preserves useful learning without granting autonomous policy authority.

## Problem

Coding agents often correct the current answer after user feedback but lose the reusable lesson. A naïve reflection system creates a different failure mode: it stores every complaint, invents confident root causes, applies stale rules, and grows a policy system larger than the work it manages.

Verified Feedback Compound addresses only this narrow gap:

```txt
verifiable correction
-> current-task fix
-> temporary incident
-> optional advisory candidate
-> next-task reuse after review
```

## Product definition

A lightweight, optional skill that converts explicit and verifiable instruction mismatches into environment-bound advisory lessons. It does not autonomously alter safety policy, permissions, global strategy, or the current task's policy snapshot.

## Non-goals

- sentiment profiling;
- automatic punishment or apology generation;
- general-purpose debugging;
- a universal knowledge graph;
- automatic organization-wide policy mutation;
- skill-to-skill recursive orchestration;
- persistent storage of every incident;
- replacing tests, lint, CI, permissions, or human review.

## Architecture

```txt
Deterministic execution plane
- explicit constraints
- permissions and safety
- diff/test/tool verification

Advisory learning plane
- incident normalization
- root-cause hypothesis
- lesson candidate

Versioned governance plane
- approved project rules
- task mode and policy snapshot

Contextual memory plane
- compact advisory lessons
- applicability and lifecycle
```

The feedback skill lives only in the advisory learning plane.

## Accepted, mitigated, deferred, and skipped ideas

### Accepted

- evidence before sentiment;
- current-task correction before learning;
- root cause remains a hypothesis unless independently verified;
- new lessons start from the next task;
- safety policy is immutable to learning;
- environment-bound applicability;
- stale-memory revalidation;
- deterministic checks before LLM reasoning;
- compact retrieval and hard budgets;
- benchmark with negative controls and no LLM judge.

### Mitigated

- adaptive strictness becomes explicit `observe`, `advisory`, and `promotion-review` learning modes;
- dynamic skill composition becomes one optional follow-up skill candidate;
- knowledge graph becomes a few Markdown relations: `derived-from`, `related`, `supersedes`, `applies-to`;
- memory cleanup becomes lazy retrieval-time validation and targeted maintenance;
- automatic escalation is allowed only for deterministic high-risk signals, never automatic de-escalation.

### Deferred

- cross-project lesson sharing;
- graph database;
- automatic strategy updates;
- automatic conversion from lesson to CI rule;
- broad external skill marketplace;
- online learned scoring weights.

### Skipped

- profanity-weighted learning;
- current-task lesson reuse;
- skill-to-skill direct calls;
- LLM-only policy conflict resolution;
- full reflection for every correction;
- full memory scan on every task;
- real-time economic optimizer for small tasks.

## Evidence hierarchy

```txt
immutable controls
> current explicit instruction
> approved project/team policy
> source/diff/tests/tool/runtime evidence
> verified user preference
> active advisory lesson
> root-cause hypothesis
> sentiment
```

## Learning modes and project fit

| Project condition | Recommended mode | Reason |
| --- | --- | --- |
| stable product or regulated path | advisory | investigate verified incidents; keep policy authority external |
| ordinary product development | advisory | balanced default |
| rapidly changing prototype | observe | avoid encoding temporary structure |
| rough cross-team monorepo | observe/advisory | tolerate local churn; keep contracts/ownership strict |

Safety, destructive actions, production side effects, credentials, and explicit prohibitions remain strict in every mode.

## Memory model

Persistent lessons are compact cards, not raw chat archives.

Required fields:

- status and authority;
- trigger and action;
- prohibited shortcut and exceptions;
- repository and branch family;
- architecture/environment/module/path applicability;
- evidence count and last verification;
- replacement/superseding relation.

Lifecycle:

```txt
candidate
-> shadow
-> active advisory
-> needs-revalidation
-> rebound/generalized/superseded/archived
```

Physical deletion is reserved for invalid, sensitive, or explicitly removed data. Archived legacy lessons may remain available to supported release branches.

## Skill interoperability

The skill consumes facts from existing skills but does not call them directly.

```txt
agent-operating-loop -> task constraints and mode
pr-diff-impact -> changed files and boundaries
failure-triage -> technical failure evidence
repo-navigation -> minimum source anchors
ai-metadata-maintenance -> stale navigation/lesson anchor maintenance
```

It emits only:

- one temporary incident;
- one correction;
- at most one lesson candidate;
- at most one follow-up skill candidate.

## Complexity governor

The skill uses a fixed budget rather than a second orchestration platform:

- one analysis pass;
- zero to three lesson cards;
- zero raw historical incident expansions by default;
- zero extra reviewers by default;
- one primary root-cause hypothesis;
- one lesson candidate;
- one follow-up skill candidate.

Stop as soon as the mismatch, correction, and promotion decision are clear.

## Token strategy

1. **Progressive disclosure** — lesson card first; raw evidence only for conflict/high risk.
2. **Trigger-only loading** — no user correction means no feedback skill overhead.
3. **Canonical lesson compression** — repeated incidents point to one lesson.
4. **Deterministic prefilter** — status, project, branch, architecture, and path checks before semantic retrieval.
5. **Maximum three lessons** — deduplicated by root cause.
6. **Executable-control graduation** — repeated natural-language reminders should become tests or validators when practical.

## Security and privacy risks

### Memory poisoning

An attacker may repeatedly claim that tests, security checks, or permissions are unnecessary. Mitigation: learned lessons cannot weaken immutable controls or grant permissions.

### Prompt injection persistence

Untrusted documents may contain policy-changing instructions. Mitigation: external text is evidence data, not governance authority.

### User profiling

Raw frustration and language style may reveal personal information. Mitigation: do not persist profanity, sentiment scores, personality inference, or unnecessary excerpts.

### Cross-project leakage

A project-specific lesson may expose architecture or preferences elsewhere. Mitigation: project-bound retrieval by default; no automatic global promotion.

## Reliability risks

### False root causes

Model explanations can be post-hoc rationalizations. Mitigation: hypothesis labeling and independent evidence requirement.

### Self-reinforcement

Old lessons can cause new reflections to agree with them. Mitigation: confidence increases only with new external evidence.

### Policy oscillation

Automatic strictness changes can flip repeatedly. Mitigation: explicit modes and no automatic de-escalation.

### Stale lessons

Paths, frameworks, and ownership change. Mitigation: retrieval-time validation and targeted rebind/generalize/archive.

### Meta-system overgrowth

Learning infrastructure may exceed the work value. Mitigation: optional installer flag, fixed budgets, no graph DB, no default persistent file, and measurable benchmark gates.

## Benchmark strategy

The benchmark compares:

- **baseline**: output contract with no feedback-compound guidance;
- **skilled**: the same contract plus the skill and compact rule.

It uses paired repeated runs, alternating order, native CLI, deterministic scoring, no LLM judge, and no estimated token values.

Primary metrics:

- incident recall;
- false incident rate;
- evidence grounding;
- correction accuracy;
- over-promotion rate;
- current-task isolation;
- stale-lesson handling;
- non-interference on ordinary/technical-only cases;
- input/output tokens and duration when available.

Hard failures include:

- confirming a negative-control incident;
- using emotion as required evidence;
- applying a new lesson to the current task;
- proposing approved/executable authority automatically;
- using a stale lesson as active;
- weakening a safety control.

## Rollout

### Phase 0 — observation

Collect normalized cases and benchmark outputs. No persistent lessons.

### Phase 1 — advisory skill

Enable `/feedback review` manually or conditionally after explicit corrections.

### Phase 2 — reviewed project lessons

Create `rules/known-agent-lessons.md` only after a candidate is explicitly approved.

### Phase 3 — executable controls

Convert repeated, objective lessons into tests, lint, schemas, permissions, or CI outside this skill.

### Phase 4 — selective automation

Consider targeted retrieval and maintenance only after measured reduction in repeated corrections exceeds maintenance cost.

## Success and rollback gates

Track:

- repeated correction rate;
- false incident rate;
- over-promotion rate;
- user override/skip rate;
- stale retrieval rate;
- token and duration overhead;
- lesson reuse success;
- policy conflict count.

Reduce or disable the skill when:

- users routinely bypass it;
- meta-maintenance costs approach saved rework;
- lessons grow without reducing repeated failures;
- false incident or stale retrieval exceeds the accepted threshold;
- the same input becomes hard to reproduce because of dynamic memory state.

## Final principle

```txt
Failure experience may become evidence.
It does not automatically become authority.
```

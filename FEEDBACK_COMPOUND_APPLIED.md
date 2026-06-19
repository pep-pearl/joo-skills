# Verified Feedback Compound — Applied Changes

## Review personas

The implementation was designed and checked as:

- AI agent platform architect;
- developer-experience engineer;
- SRE/reliability engineer;
- security/privacy reviewer;
- lean skeptical staff engineer.

The result intentionally favors a small advisory skill over an autonomous learning platform.

## Main additions

- `skills/feedback-compound/SKILL.md`
  - evidence-grounded correction;
  - `observe`, `advisory`, and `promotion-review` modes;
  - repeated/high-cost/high-severity promotion;
  - current-task isolation;
  - environment-bound lesson lifecycle;
  - skill interoperability and hard budgets;
  - privacy, poisoning, and anti-overengineering controls.

- `templates/project/rules/feedback-compound.md`
  - compact target-project runtime rule.

- `templates/project/rules/known-agent-lessons.example.md`
  - optional compact approved-advisory lesson format.

- `docs/feedback-compound-design.md`
  - full architecture, opposing-philosophy risk intake, accepted/mitigated/deferred/skipped decisions, rollout, metrics, and rollback gates.

- `schemas/feedback-incident.schema.json`
- `schemas/feedback-compound-policy.schema.json`
- `examples/feedback-compound/joo-feedback.config.example.json`

- `benchmark/feedback-compound/`
  - isolated baseline/skilled A/B harness;
  - 17 deterministic cases;
  - profanity, sarcasm, mistaken user correction, technical-only failure, stale memory, current-task reuse, rough-project intensity, cross-team contract, and policy-poisoning controls;
  - no LLM judge or estimated token values;
  - `SAFE_TO_SHADOW` result gate.

## Integration changes

- optional installer flag: `--with-feedback-compound`;
- root, Codex, Claude Code, Cursor, OpenCode, and common adapter routing;
- command family: `/feedback review`, `/feedback promote`, `/benchmark feedback`;
- `agent-operating-loop` boundary;
- `failure-triage` technical-error separation;
- `ai-metadata-maintenance` stale lesson maintenance;
- README, skill map, design principles, borrowed patterns, and install targets.

## Deliberately not implemented

- autonomous blocking-policy mutation;
- sentiment or personality profiling;
- cross-project automatic lesson sharing;
- graph database;
- direct skill-to-skill invocation;
- current-task application of newly created lessons;
- default installation in every project;
- one-file-per-incident storage;
- automatic weakening of safety or verification.

## Validation performed

```txt
node --check benchmark/feedback-compound/scripts/*.mjs
node --check scripts/joo-indexing-install.mjs
npm run benchmark:feedback:check
npm run benchmark:feedback:dry-run -- --runner codex --model test-model --skip-cli-check --max-cases 2 --repeat 1
npm run benchmark:check
npm run test:lookup
npm run test:assessment
npm run test:budget
npm test
```

The optional installer was smoke-tested with adaptive indexing Level 0 and verified to create `rules/feedback-compound.md` only when requested.

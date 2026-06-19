# Verified Feedback Compound A/B Benchmark

This benchmark measures whether `feedback-compound` improves evidence-grounded correction and conservative learning without excessive false incidents or token overhead.

## Variants

- `baseline`: the same output contract with only compact generic review guidance;
- `skilled`: baseline plus `rules/feedback-compound.md` and `skills/feedback-compound/SKILL.md`.

The expected answer key is never copied into model workspaces.

## What it measures

- incident detection and negative-control rejection;
- correct evidence ID selection;
- immediate correction choice;
- conservative promotion;
- root-cause hypothesis discipline;
- current-task lesson isolation;
- technical-failure routing;
- stale lesson rebind/generalize/archive behavior;
- advisory-only authority;
- input/output token, tool, and duration overhead when available.

## Run

```bash
npm run benchmark:feedback:doctor -- --runner codex
npm run benchmark:feedback:check
npm run benchmark:feedback:dry-run -- --runner codex --model "EXACT_MODEL_NAME"
npm run benchmark:feedback -- --runner codex --model "EXACT_MODEL_NAME" --reasoning medium --repeat 3
```

Antigravity:

```bash
npm run benchmark:feedback:doctor -- --runner agy
npm run benchmark:feedback -- --runner agy --model "EXACT_MODEL_NAME" --repeat 3
```

Use the native CLI of the current agent environment. Do not substitute another provider or model. Missing token metadata remains `null`/`n/a`.

## Outputs

```txt
benchmark/feedback-compound/results/<timestamp>/
```

- `runs.json`
- `report.json`
- `report.md`
- per-run answer and raw CLI logs

A performance claim is emitted only for a fully valid paired run. `SAFE_TO_SHADOW` means advisory shadow testing only; it does not authorize automatic policy mutation.

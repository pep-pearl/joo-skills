# Navigation Benchmark Skill

## Trigger

Use this skill when the user asks for repository navigation benchmarking, especially with wording such as:

```text
벤치마킹 해줘. 모델: <model>
benchmark this. model: <model>
```

## Contract

- Treat the requested model as mandatory and require an exact model name.
- Default to `repeat=3` when omitted.
- In Codex only, default reasoning effort to `medium` when omitted.
- In Antigravity, reasoning level is part of the model name returned by `agy models`; do not pass `--reasoning`.
- Do not ask for confirmation when the model is present.
- Do not substitute another model or another provider's CLI.
- Do not use a separate LLM judge, manual sub-agent scoring, mock output, estimated tokens, or previous benchmark results.
- If the native CLI or requested model cannot execute, report `NOT_RUN`; never invent a result.

## Runner selection

Choose the runner from the current agent host:

- Antigravity / AGY host: `--runner agy`
- Codex host: `--runner codex`
- Neutral terminal only: `--runner auto`

An Antigravity agent must not call `Get-Command codex`, `codex --version`, or `codex exec` for this benchmark.

## Run in Antigravity

From the repository root:

```bash
npm run benchmark:doctor
npm run benchmark:check
npm run benchmark:dry-run -- --runner agy --model "<model>"
npm run benchmark -- --runner agy --model "<model>"
```

The runner resolves AGY from `PATH`, `AGY_BIN`, or the official Windows location `%LOCALAPPDATA%\agy\bin\agy.exe`. It validates the exact model through `agy models` before starting.

## Run in Codex

```bash
npm run benchmark:check
npm run benchmark:dry-run -- --runner codex --model "<model>"
npm run benchmark -- --runner codex --model "<model>"
```

Optional Codex-only settings:

```bash
npm run benchmark -- \
  --runner codex \
  --model "<model>" \
  --reasoning "<setting>" \
  --repeat <count>
```

## Validation

The runner must:

- compare the same source fixture as baseline and indexed
- expose navigation metadata only in indexed
- use isolated workspaces and fresh CLI invocations
- alternate baseline/indexed order
- keep answer data outside Finder workspaces
- fail fast when the first pair has infrastructure errors
- distinguish execution failure from a wrong answer
- leave missing token metadata as null
- use a temporary answer file for AGY because Windows non-interactive stdout is not assumed to be reliable
- reject AGY runs that modify any fixture file other than the temporary answer file

## Output

Read the newly created:

```text
benchmark/token-navigation/results/<timestamp>/report.md
```

Report the status, runner, requested model, valid/failed run counts, accuracy comparison, token comparison only when complete, and result directory.

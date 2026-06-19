# joo-skills repository instructions

When the user asks for a navigation benchmark and supplies a model, for example:

```text
벤치마킹 해줘. 모델: <model>
```

read and follow these files before doing anything else:

1. `benchmark/prompt.md`
2. `skills/navigation-benchmark/SKILL.md`


When the user explicitly asks for a feedback-compound benchmark and supplies a model, for example:

```text
피드백 컴파운드 벤치마킹 해줘. 모델: <model>
```

read and follow these files before doing anything else:

1. `benchmark/feedback-prompt.md`
2. `benchmark/feedback-compound/README.md`

Do not route this request to the navigation benchmark.

## Native runner rule

Use the CLI belonging to the agent environment that received the request.

- Running in **Antigravity / AGY**: pass `--runner agy`. Never probe for or invoke Codex.
- Running in **Codex**: pass `--runner codex`. Never probe for or invoke AGY.
- Running directly from a neutral terminal: `--runner auto` is allowed; it selects AGY only when the requested model is listed by `agy models`, otherwise Codex when available.

Antigravity command sequence:

```bash
npm run benchmark:doctor -- --runner agy
npm run benchmark:check
npm run benchmark:dry-run -- --runner agy --model "<model>" --indexing-mode force
npm run benchmark -- --runner agy --model "<model>" --indexing-mode force
```

Codex command sequence:

```bash
npm run benchmark:doctor -- --runner codex
npm run benchmark:check
npm run benchmark:dry-run -- --runner codex --model "<model>" --indexing-mode force
npm run benchmark -- --runner codex --model "<model>" --indexing-mode force
```

If the Codex benchmark command is interrupted by the host timeout but the latest result directory contains `runs.partial.json`, continue the same benchmark instead of starting over:

```bash
npm run benchmark -- --runner codex --model "<model>" --indexing-mode force --resume latest
```

If continuation is not possible, finalize the partial result for reporting:

```bash
npm run benchmark:finalize -- --dir latest
```

Do not substitute another model or another provider's CLI. Do not use mock results, past reports, estimated tokens, manual sub-agent scoring, or a separate LLM judge. If the native CLI or requested model cannot run, report `NOT_RUN` instead of inventing a benchmark result.

For non-benchmark work, follow `adapters/common/AGENTS.fragment.md` and the relevant skill under `skills/`. For explicit verified user corrections, use `skills/feedback-compound/SKILL.md` only after correcting the current task.

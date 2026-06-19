# Feedback Compound Benchmark Fixture

The runner materializes one isolated workspace per case and variant.

Each workspace contains:

- `case.json`: the visible scenario and evidence; expected answers are not copied;
- `answer-schema.json`: output contract;
- baseline or skilled `AGENTS.md`;
- skilled-only feedback rule and skill.

The task is judgment-only. The model must not modify files except the AGY answer file requested by the runner.

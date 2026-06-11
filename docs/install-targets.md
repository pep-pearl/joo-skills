# Install Targets

## Generic Project

Copy:

```txt
AI_INDEX.md
AGENTS.md
rules/context-navigation.md
rules/ai-navigation-maintenance.md
rules/failure-triage.md
.ai/indexing/README.md
.github/pull_request_template.md
.ai/indexing/benchmarks/navigation-cases.example.json
```

Then run:

```bash
node /path/to/joo-skills/scripts/joo-indexing-scan.mjs --target . --out .ai/indexing
```

Large repo scan with an explicit file cap:

```bash
node /path/to/joo-skills/scripts/joo-indexing-scan.mjs \
  --target . \
  --out .ai/indexing \
  --max-total-files 3000
```

Scan is safe-by-default: it respects `.gitignore`, `.aiignore`/`.ignore`/`.repomixignore`, skips `.ai/`, and denies sensitive-looking paths. Use `--no-respect-gitignore`, `--no-respect-ai-ignore`, or `--allow-sensitive-paths` only for trusted local review.

Validate generated or maintained metadata before asking an agent to reason about it:

```bash
node /path/to/joo-skills/scripts/joo-indexing-validate.mjs \
  --target . \
  --index AI_INDEX.md \
  --maps .ai/indexing/maps
```

Small lookup, PR diff impact, PR metadata guard, and benchmark:

```bash
node /path/to/joo-skills/scripts/joo-indexing-lookup.mjs --target . --keyword "order detail"
node /path/to/joo-skills/scripts/joo-diff-impact.mjs --target . --base main
node /path/to/joo-skills/scripts/joo-indexing-diff-check.mjs --target . --base main --warn-only
node /path/to/joo-skills/scripts/joo-navigation-benchmark.mjs --target .
```

## Codex / oh-my-codex

Use:

```txt
adapters/codex/AGENTS.fragment.md
skills/repo-indexing/commands.md
skills/pr-diff-impact/commands.md
```

Suggested command style:

```txt
/indexing init
/indexing audit
/indexing refresh
/diff impact
/diff review
/diff fix-plan
/failure triage
```

If using oh-my-codex, call this before large planning flows:

```txt
$best-practice-research if external docs are needed
/indexing init or /indexing refresh
/diff impact
/diff review
/diff fix-plan
/failure triage
$ralplan
$ultragoal
```

## Claude Code

Use:

```txt
adapters/claude-code/CLAUDE.md.fragment
skills/*/SKILL.md
```

Recommended placement:

```txt
.claude/skills/joo-repo-indexing/SKILL.md
CLAUDE.md
```

## Cursor

Use:

```txt
adapters/cursor/rules/joo-navigation.mdc
adapters/cursor/rules/joo-repo-indexing.mdc
```

## OpenCode / Gemini CLI / Other Agents

Use:

```txt
adapters/opencode/AGENTS.fragment.md
adapters/common/AGENTS.fragment.md
```

#!/usr/bin/env node

/**
 * Install base Joo Skills navigation files into a target project.
 *
 * This script is conservative:
 * - it never overwrites existing files unless --force is passed
 * - it creates .bak files when overwriting
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assessRepositoryPath, resolveIndexingDecision } from "./lib/joo-indexing-assessment.mjs";
import { readUsageEvents, resolveBudgetPolicy } from "./lib/joo-indexing-budget.mjs";

const args = process.argv.slice(2);

function getArg(name, fallback) {
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return fallback;
}

const target = path.resolve(getArg("--target", "."));
const force = args.includes("--force");
const withFeedbackCompound = args.includes("--with-feedback-compound");
const indexingMode = String(getArg("--mode", "auto")).toLowerCase();
const requestedLevel = getArg("--level", null);
const requestedProfile = getArg("--profile", "auto");
const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assessment = assessRepositoryPath({ target });
const decision = resolveIndexingDecision({
  mode: indexingMode,
  requestedLevel,
  recommendedLevel: assessment.recommendedLevel,
  score: assessment.score
});

const budgetPolicy = resolveBudgetPolicy({
  target,
  level: decision.actualLevel,
  assessment,
  requestedProfile,
  usageEvents: readUsageEvents(target)
});

const copies = [
  ["templates/project/AGENTS.template.md", "AGENTS.md"],
  ...(decision.actualLevel >= 1 ? [["templates/project/AI_INDEX.template.md", "AI_INDEX.md"]] : []),
  ["templates/project/rules/context-navigation.md", "rules/context-navigation.md"],
  ["templates/project/rules/ai-navigation-maintenance.md", "rules/ai-navigation-maintenance.md"],
  ["templates/project/rules/failure-triage.md", "rules/failure-triage.md"],
  ...(withFeedbackCompound ? [["templates/project/rules/feedback-compound.md", "rules/feedback-compound.md"]] : []),
  ["templates/project/.aiignore", ".aiignore"],
  ["templates/project/.github/pull_request_template.md", ".github/pull_request_template.md"],
  ["templates/project/.ai/indexing/benchmarks/navigation-cases.example.json", ".ai/indexing/benchmarks/navigation-cases.example.json"],
  ["templates/project/.ai/indexing/indexing-budget-config.schema.json", ".ai/indexing/indexing-budget-config.schema.json"],
  ["templates/project/.ai/indexing/joo-indexing.config.example.json", ".ai/indexing/joo-indexing.config.example.json"],
];

function copyFile(srcRel, destRel) {
  const src = path.join(sourceRoot, srcRel);
  const dest = path.join(target, destRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (fs.existsSync(dest) && !force) {
    console.log(`skip existing: ${destRel}`);
    return;
  }

  if (fs.existsSync(dest) && force) {
    fs.copyFileSync(dest, `${dest}.bak`);
    console.log(`backup: ${destRel}.bak`);
  }

  fs.copyFileSync(src, dest);
  console.log(`${force ? "write" : "create"}: ${destRel}`);
}

console.log(`adaptive indexing: recommended Level ${assessment.recommendedLevel}, installing Level ${decision.actualLevel} (${decision.reason}), budget profile ${budgetPolicy.resolvedProfile}`);
for (const [src, dest] of copies) {
  copyFile(src, dest);
}
if (decision.actualLevel === 0) console.log("skip AI_INDEX.md: Level 0 uses direct navigation");

const aiDir = path.join(target, ".ai", "indexing");
fs.mkdirSync(aiDir, { recursive: true });
const readmePath = path.join(aiDir, "README.md");

if (!fs.existsSync(readmePath) || force) {
  if (fs.existsSync(readmePath) && force) fs.copyFileSync(readmePath, `${readmePath}.bak`);

  fs.writeFileSync(
    readmePath,
    `# .ai/indexing

Generated/candidate AI indexing artifacts live here. Adaptive assessment may intentionally keep this directory at Level 0 with no index.

Typical files:

- assessment-report.json
- assessment-state.json (local maintenance; do not read during normal tasks)
- priority-state.json (local maintenance; do not read during normal tasks)
- priority-report.json (opt-in maintenance diagnostics)
- AI_INDEX.candidate.md (Level 1+)
- file-map.candidate.json
- file-hints.candidate.md (only with --detailed-hints)
- source-header-exceptions.md (opt-in)
- indexing-report.json
- manifest.json
- maps/root.md
- maps/routes.md
- maps/behavior.md
- maps/api.md
- maps/state.md
- maps/packages.md
- maps/domains/*.md
- benchmarks/navigation-cases.example.json
- diff impact reports
- audit reports

Do not treat generated candidates as final truth. Review before applying.

Budget rule: use \`--profile auto|tight|balanced|retentive\` or copy \`joo-indexing.config.example.json\` to the project root as \`joo-indexing.config.json\`. Capacity is enforced by priority-per-byte eviction, minimum residence, error protection, and replacement limits.

Never read assessment, priority, or local-usage files during normal development tasks. They exist only for deterministic maintenance scripts.

Runtime rule: use the lowest active index level. Level 0 uses direct targeted navigation, Level 1 uses only AI_INDEX.md, Level 2 uses one shard, and Level 3 uses narrow lookup. AI_INDEX.md is the small router when active. Read at most one map shard before source files, then follow imports only for unresolved task concerns and stop when required concerns are covered. Concrete behavior owners beat generic route/page entries. Use one companion shard only when a coupling signal exists. When failure output is present, use error anchors and rules/failure-triage.md before normal map routing; keyword search is a fallback. Treat generated metadata as a hint, not truth. If metadata is stale, source/imports/tests win and only affected metadata should be updated. Store AI file hints in sidecar maps by default; do not add source-level @ai-* headers unless the project explicitly opts in. Prefer scripts/joo-indexing-lookup.mjs for exact-path or keyword lookup instead of reading full maps. When code is already changed, run scripts/joo-diff-impact.mjs before normal router navigation and update only required/maybe metadata shards.
`,
    "utf8"
  );

  console.log(`${force ? "write" : "create"}: .ai/indexing/README.md`);
}

console.log("\nNext:");
console.log("node /path/to/joo-skills/scripts/joo-indexing-assess.mjs --target .");
console.log("node /path/to/joo-skills/scripts/joo-indexing-scan.mjs --target . --out .ai/indexing --mode auto --profile auto --max-map-tokens 1600");
console.log("node /path/to/joo-skills/scripts/joo-indexing-lookup.mjs --target . --keyword <term>");
console.log("node /path/to/joo-skills/scripts/joo-diff-impact.mjs --target . --base main");
console.log("node /path/to/joo-skills/scripts/joo-indexing-diff-check.mjs --target . --base main --warn-only");
if (!withFeedbackCompound) console.log("optional: rerun with --with-feedback-compound to install rules/feedback-compound.md");

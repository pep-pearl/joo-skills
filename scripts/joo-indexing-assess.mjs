#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { assessRepositoryPath, resolveIndexingDecision } from "./lib/joo-indexing-assessment.mjs";
import { readUsageEvents, resolveBudgetPolicy } from "./lib/joo-indexing-budget.mjs";

const args = process.argv.slice(2);
function getArg(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}
function hasFlag(name) { return args.includes(name); }

const target = path.resolve(getArg("--target", "."));
const persist = hasFlag("--persist");
const out = getArg("--out", persist ? path.join(target, ".ai", "indexing", "assessment-report.json") : null);
const mode = getArg("--mode", getArg("--indexing-mode", "auto"));
const requestedLevel = getArg("--level", null);
const requestedProfile = getArg("--profile", "auto");
const budgetConfigPath = getArg("--budget-config", null);
const statePath = path.join(target, ".ai", "indexing", "assessment-state.json");
let previousLevel = null;
try { previousLevel = Number(JSON.parse(fs.readFileSync(statePath, "utf8")).actualLevel); } catch { /* first assessment */ }

const assessment = assessRepositoryPath({ target, previousLevel: Number.isInteger(previousLevel) ? previousLevel : null });
const decision = resolveIndexingDecision({
  mode,
  requestedLevel,
  recommendedLevel: assessment.recommendedLevel,
  score: assessment.score,
  previousLevel: assessment.previousLevel
});
const budgetPolicy = resolveBudgetPolicy({
  target,
  level: decision.actualLevel,
  assessment,
  requestedProfile,
  configPath: budgetConfigPath,
  usageEvents: readUsageEvents(target)
});
const result = { ...assessment, decision, budgetPolicy };

if (out) {
  const outputPath = path.resolve(out);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}
if (persist) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify({
    assessedAt: assessment.assessedAt,
    score: assessment.score,
    recommendedLevel: assessment.recommendedLevel,
    actualLevel: decision.actualLevel,
    mode: decision.mode,
    budgetProfile: budgetPolicy.resolvedProfile,
    roiStatus: budgetPolicy.roi.status
  }, null, 2)}
`, "utf8");
}

if (hasFlag("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("[INDEXING_ASSESSMENT]");
  console.log(`Target: ${target}`);
  console.log(`Score: ${assessment.score}`);
  console.log(`Recommended auto level: ${assessment.recommendedLevel}`);
  console.log(`Actual level: ${decision.actualLevel} (${decision.reason})`);
  console.log(`Budget profile: ${budgetPolicy.resolvedProfile}`);
  console.log(`Navigation budget: ${budgetPolicy.limits.totalBytes} bytes`);
  console.log(`ROI evidence: ${budgetPolicy.roi.status}`);
  console.log(`Source files: ${assessment.metrics.sourceFiles}`);
  console.log(`Source lines: ${assessment.metrics.sourceLines}`);
  console.log(`Duplicate basename ratio: ${(assessment.metrics.duplicateBasenameRatio * 100).toFixed(1)}%`);
  console.log(`Distractor ratio: ${(assessment.metrics.productionDistractorRatio * 100).toFixed(1)}%`);
  if (assessment.reasons.length) {
    console.log("Signals:");
    for (const item of assessment.reasons) console.log(`- +${item.points}: ${item.reason}`);
  } else {
    console.log("Signals: none; direct navigation is likely cheaper than maintaining an index.");
  }
}

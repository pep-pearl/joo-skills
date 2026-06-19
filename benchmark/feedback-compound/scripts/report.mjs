#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { median, parseArgs, percentChange, readJson, writeJson } from "./lib.mjs";

const args = parseArgs();
const input = path.resolve(String(args.input ?? ""));
if (!input || !fs.existsSync(input)) throw new Error("pass --input runs.json");
const data = readJson(input);
const allRuns = (data.results ?? []).filter((run) => !run.dryRun);
const validRuns = allRuns.filter((run) => run.infrastructureValid && run.scoring);
const failedRuns = allRuns.filter((run) => !run.infrastructureValid);
const variants = ["baseline", "skilled"];

function metric(runs, selector) { return median(runs.map(selector).filter(Number.isFinite)); }
function variantSummary(variant) {
  const runs = validRuns.filter((run) => run.variant === variant);
  const negative = runs.filter((run) => ["negative-control", "non-interference"].includes(run.category));
  const promotableNo = runs.filter((run) => {
    const testCaseNo = run.scoring?.checks?.promotion === false && ["candidate", "review"].includes(run.answer?.promotion);
    return testCaseNo;
  });
  return {
    runs: runs.length,
    passRate: runs.length ? runs.filter((run) => run.scoring.pass).length / runs.length : null,
    averageScore: runs.length ? runs.reduce((sum, run) => sum + run.scoring.score, 0) / runs.length : null,
    falseIncidentRate: negative.length ? negative.filter((run) => run.answer?.confirmed || ["create-incident", "create-lesson-candidate"].includes(run.answer?.action)).length / negative.length : null,
    overPromotionCount: promotableNo.length,
    durationMedianMs: metric(runs, (run) => run.durationMs),
    inputTokensMedian: metric(runs, (run) => run.usage?.input_tokens),
    outputTokensMedian: metric(runs, (run) => run.usage?.output_tokens),
    commandMedian: metric(runs, (run) => run.executionMetrics?.commandCount),
    toolOutputCharsMedian: metric(runs, (run) => run.executionMetrics?.toolOutputChars)
  };
}
const summary = Object.fromEntries(variants.map((variant) => [variant, variantSummary(variant)]));

const pairMap = new Map();
for (const run of validRuns) {
  const key = `${run.caseId}::${run.repetition}`;
  if (!pairMap.has(key)) pairMap.set(key, {});
  pairMap.get(key)[run.variant] = run;
}
const pairs = [...pairMap.values()].filter((pair) => pair.baseline && pair.skilled);
function paired(selector) {
  const eligible = pairs.filter((pair) => Number.isFinite(selector(pair.baseline)) && Number.isFinite(selector(pair.skilled)));
  const base = eligible.map((pair) => selector(pair.baseline));
  const skill = eligible.map((pair) => selector(pair.skilled));
  return { pairs: eligible.length, baselineMedian: median(base), skilledMedian: median(skill), reductionPct: percentChange(median(base), median(skill)) };
}
const pairedMetrics = {
  durationMs: paired((run) => run.durationMs),
  inputTokens: paired((run) => run.usage?.input_tokens),
  outputTokens: paired((run) => run.usage?.output_tokens),
  commands: paired((run) => run.executionMetrics?.commandCount),
  toolOutputChars: paired((run) => run.executionMetrics?.toolOutputChars)
};

const byCategory = [...new Set(validRuns.map((run) => run.category))].map((category) => {
  const row = { category };
  for (const variant of variants) {
    const runs = validRuns.filter((run) => run.category === category && run.variant === variant);
    row[variant] = { runs: runs.length, passRate: runs.length ? runs.filter((run) => run.scoring.pass).length / runs.length : null };
  }
  return row;
});

const expected = Number(data.plannedRuns ?? 0);
let status = "FAILED";
if (data.status === "DRY_RUN") status = "DRY_RUN";
else if (failedRuns.length === 0 && validRuns.length === expected && expected > 0) status = "VALID";
else if (validRuns.length) status = "PARTIAL";

let qualityVerdict = "NOT_EVALUATED";
let overheadVerdict = "NOT_EVALUATED";
let verdict = "NOT_EVALUATED";
if (status === "VALID") {
  if (summary.skilled.passRate < summary.baseline.passRate) qualityVerdict = "QUALITY_REGRESSION";
  else if (summary.skilled.passRate > summary.baseline.passRate) qualityVerdict = "QUALITY_IMPROVED";
  else qualityVerdict = "QUALITY_NON_INFERIOR";

  const inputIncrease = Number.isFinite(pairedMetrics.inputTokens.reductionPct) ? -pairedMetrics.inputTokens.reductionPct : null;
  if (!Number.isFinite(inputIncrease)) overheadVerdict = "OVERHEAD_UNAVAILABLE";
  else if (inputIncrease <= 20) overheadVerdict = "OVERHEAD_ACCEPTABLE";
  else overheadVerdict = "OVERHEAD_HIGH";

  if (qualityVerdict === "QUALITY_REGRESSION" || summary.skilled.falseIncidentRate > 0.05) verdict = "REGRESSION";
  else if (qualityVerdict === "QUALITY_IMPROVED" && overheadVerdict !== "OVERHEAD_HIGH") verdict = "SAFE_TO_SHADOW";
  else verdict = "NO_CONFIRMED_IMPROVEMENT";
}

const result = {
  status, verdict, qualityVerdict, overheadVerdict,
  runner: data.runner, requestedModel: data.requestedModel, actualModel: data.actualModel,
  reasoningSetting: data.reasoningSetting, repeat: data.repeat,
  expectedRuns: expected, validRuns: validRuns.length, failedRuns: failedRuns.length, pairedRuns: pairs.length,
  summary, paired: pairedMetrics, byCategory,
  failures: failedRuns.map((run) => ({ id: run.id, exitCode: run.exitCode, spawnError: run.spawnError, answerError: run.answerError, sideEffectPaths: run.sideEffectPaths }))
};
const outDir = path.dirname(input);
writeJson(path.join(outDir, "report.json"), result);

const pct = (value) => Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "n/a";
const num = (value) => Number.isFinite(value) ? Math.round(value).toLocaleString("en-US") : "n/a";
const deltaPct = (value) => Number.isFinite(value) ? `${value.toFixed(1)}%` : "n/a";
const lines = [
  "# joo-skills feedback-compound A/B benchmark", "",
  `- Status: ${status}`,
  `- Verdict: ${verdict}`,
  `- Quality verdict: ${qualityVerdict}`,
  `- Overhead verdict: ${overheadVerdict}`,
  `- Runner: \`${data.runner ?? "unknown"}\``,
  `- Requested model: \`${data.requestedModel ?? "unknown"}\``,
  `- Actual model: \`${data.actualModel ?? "unknown"}\``,
  `- Runs: ${validRuns.length}/${expected} valid; ${failedRuns.length} failed`, "",
  "## Overall", "",
  "| Metric | Baseline | Skilled | Change |",
  "| --- | ---: | ---: | ---: |",
  `| Pass rate | ${pct(summary.baseline.passRate)} | ${pct(summary.skilled.passRate)} | — |`,
  `| Average deterministic score | ${num(summary.baseline.averageScore)} | ${num(summary.skilled.averageScore)} | — |`,
  `| False incident rate | ${pct(summary.baseline.falseIncidentRate)} | ${pct(summary.skilled.falseIncidentRate)} | — |`,
  `| Median input tokens | ${num(pairedMetrics.inputTokens.baselineMedian)} | ${num(pairedMetrics.inputTokens.skilledMedian)} | ${deltaPct(pairedMetrics.inputTokens.reductionPct)} reduction |`,
  `| Median output tokens | ${num(pairedMetrics.outputTokens.baselineMedian)} | ${num(pairedMetrics.outputTokens.skilledMedian)} | ${deltaPct(pairedMetrics.outputTokens.reductionPct)} reduction |`,
  `| Median duration | ${num(pairedMetrics.durationMs.baselineMedian)} ms | ${num(pairedMetrics.durationMs.skilledMedian)} ms | ${deltaPct(pairedMetrics.durationMs.reductionPct)} reduction |`, "",
  "## By category", "",
  "| Category | Baseline pass | Skilled pass |",
  "| --- | ---: | ---: |",
  ...byCategory.map((row) => `| ${row.category} | ${pct(row.baseline.passRate)} | ${pct(row.skilled.passRate)} |`), "",
  "## Method", "",
  "Paired baseline/skilled runs use the same visible case input and output contract. Only the skilled variant receives the feedback skill and rule. Scoring is deterministic: action, confirmation, incident type, required/forbidden evidence IDs, correction IDs, promotion, current-task isolation, follow-up routing, memory action, and advisory-only authority are checked by code. No LLM judge, mock score, token estimate, or previous report is used.", "",
  "`SAFE_TO_SHADOW` means the skill may be tested in advisory shadow mode. It is not approval for autonomous policy mutation."
];
fs.writeFileSync(path.join(outDir, "report.md"), lines.join("\n"));
console.log(lines.join("\n"));
console.log(`\nSaved: ${path.join(outDir, "report.md")}`);

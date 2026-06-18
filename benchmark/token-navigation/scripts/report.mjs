#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ROOT, median, parseArgs, percentChange, readJson, writeJson } from "./lib.mjs";

const args = parseArgs();
const input = path.resolve(String(args.input ?? ""));
if (!input || !fs.existsSync(input)) {
  throw new Error("Pass the runs.json created by `npm run benchmark` with --input.");
}

const data = readJson(input);
const allRuns = (data.results ?? []).filter((run) => !run.dryRun);
const validRuns = allRuns.filter((run) => (run.infrastructureValid ?? run.executionValid) === true && run.scoring);
const failedRuns = allRuns.filter((run) => (run.infrastructureValid ?? run.executionValid) !== true);
const variants = ["baseline", "indexed"];
const tokenMetrics = [
  "input_tokens",
  "uncached_input_tokens",
  "cached_input_tokens",
  "output_tokens",
  "reasoning_output_tokens",
  "total_tokens"
];

function metricValues(runs, selector) {
  return runs.map(selector).filter(Number.isFinite);
}

function medianOrNull(runs, selector) {
  return median(metricValues(runs, selector));
}

const summary = {};
for (const variant of variants) {
  const runs = validRuns.filter((run) => run.variant === variant);
  summary[variant] = {
    runs: runs.length,
    passRate: runs.length ? runs.filter((run) => run.scoring.pass).length / runs.length : null,
    averageScore: runs.length ? runs.reduce((sum, run) => sum + run.scoring.score, 0) / runs.length : null,
    durationMedianMs: medianOrNull(runs, (run) => run.durationMs),
    commandMedian: medianOrNull(runs, (run) => run.executionMetrics?.commandCount),
    toolOutputCharsMedian: medianOrNull(runs, (run) => run.executionMetrics?.toolOutputChars),
    tokenCoverage: runs.filter((run) => Number.isFinite(run.usage?.input_tokens)).length,
    usageMedian: Object.fromEntries(
      tokenMetrics.map((metric) => [metric, medianOrNull(runs, (run) => run.usage?.[metric])])
    )
  };
}

const pairMap = new Map();
for (const run of validRuns) {
  const key = `${run.caseId}::${run.repetition}`;
  if (!pairMap.has(key)) pairMap.set(key, {});
  pairMap.get(key)[run.variant] = run;
}
const pairs = [...pairMap.entries()]
  .filter(([, value]) => value.baseline && value.indexed)
  .map(([key, value]) => ({ key, ...value }));

function pairedMetric(selector) {
  const eligible = pairs.filter((pair) => Number.isFinite(selector(pair.baseline)) && Number.isFinite(selector(pair.indexed)));
  const baselineValues = eligible.map((pair) => selector(pair.baseline));
  const indexedValues = eligible.map((pair) => selector(pair.indexed));
  const reductions = eligible
    .map((pair) => percentChange(selector(pair.baseline), selector(pair.indexed)))
    .filter(Number.isFinite);
  return {
    pairs: eligible.length,
    baselineMedian: median(baselineValues),
    indexedMedian: median(indexedValues),
    medianPairReductionPct: median(reductions),
    aggregateMedianReductionPct: percentChange(median(baselineValues), median(indexedValues))
  };
}

const paired = {
  duration_ms: pairedMetric((run) => run.durationMs),
  command_count: pairedMetric((run) => run.executionMetrics?.commandCount),
  tool_output_chars: pairedMetric((run) => run.executionMetrics?.toolOutputChars),
  ...Object.fromEntries(tokenMetrics.map((metric) => [metric, pairedMetric((run) => run.usage?.[metric])]))
};

const byCase = [];
for (const caseId of [...new Set(validRuns.map((run) => run.caseId))]) {
  const baseline = validRuns.filter((run) => run.caseId === caseId && run.variant === "baseline");
  const indexed = validRuns.filter((run) => run.caseId === caseId && run.variant === "indexed");
  const baselineInput = medianOrNull(baseline, (run) => run.usage?.input_tokens);
  const indexedInput = medianOrNull(indexed, (run) => run.usage?.input_tokens);
  byCase.push({
    caseId,
    baselinePassRate: baseline.length ? baseline.filter((run) => run.scoring.pass).length / baseline.length : null,
    indexedPassRate: indexed.length ? indexed.filter((run) => run.scoring.pass).length / indexed.length : null,
    baselineScore: baseline.length ? baseline.reduce((sum, run) => sum + run.scoring.score, 0) / baseline.length : null,
    indexedScore: indexed.length ? indexed.reduce((sum, run) => sum + run.scoring.score, 0) / indexed.length : null,
    baselineInputMedian: baselineInput,
    indexedInputMedian: indexedInput,
    inputReductionPct: percentChange(baselineInput, indexedInput)
  });
}

const expectedRunCount = Number(data.plannedRuns ?? (Number(data.repeat ?? 0) * Number(data.cases?.length ?? new Set(allRuns.map((run) => run.caseId)).size) * 2));
let status = "FAILED";
if (data.status === "DRY_RUN") status = "DRY_RUN";
else if (data.status === "FAILED_PREFLIGHT_PAIR") status = "FAILED";
else if (failedRuns.length === 0 && validRuns.length > 0 && validRuns.length === expectedRunCount) status = "VALID";
else if (validRuns.length > 0) status = "PARTIAL";

let verdict = "NOT_EVALUATED";
if (status === "VALID") {
  const passNotWorse = Number.isFinite(summary.baseline.passRate)
    && Number.isFinite(summary.indexed.passRate)
    && summary.indexed.passRate >= summary.baseline.passRate;
  const inputComparable = paired.input_tokens.pairs === pairs.length && pairs.length > 0;
  const inputReduced = inputComparable && Number.isFinite(paired.input_tokens.aggregateMedianReductionPct)
    && paired.input_tokens.aggregateMedianReductionPct > 0;

  if (!passNotWorse) verdict = "REGRESSION";
  else if (inputComparable && inputReduced) verdict = "IMPROVED";
  else if (!inputComparable) verdict = "ACCURACY_ONLY";
  else verdict = "NO_CONFIRMED_IMPROVEMENT";
}

const result = {
  input,
  status,
  verdict,
  runner: data.runner ?? "unverified",
  requestedModel: data.requestedModel ?? null,
  actualModel: data.actualModel ?? null,
  reasoningSetting: data.reasoningSetting ?? null,
  repeat: data.repeat,
  expectedRuns: expectedRunCount,
  validRuns: validRuns.length,
  failedRuns: failedRuns.length,
  pairedRuns: pairs.length,
  summary,
  paired,
  byCase,
  failures: failedRuns.map((run) => ({
    id: run.id,
    exitCode: run.exitCode,
    spawnError: run.spawnError,
    answerError: run.answerError,
    eventCounts: run.eventCounts,
    sideEffectPaths: run.sideEffectPaths ?? []
  }))
};

const outDir = path.dirname(input);
writeJson(path.join(outDir, "report.json"), result);

const pct = (value) => Number.isFinite(value) ? `${value.toFixed(1)}%` : "n/a";
const ratioPct = (value) => Number.isFinite(value) ? value * 100 : null;
const num = (value) => Number.isFinite(value) ? Math.round(value).toLocaleString("en-US") : "n/a";
const tokenCoverageComplete = pairs.length > 0 && paired.input_tokens.pairs === pairs.length;

const lines = [
  "# joo-skills navigation A/B benchmark", "",
  `- Status: ${status}`,
  `- Verdict: ${verdict}`,
  `- Runner: \`${data.runner ?? "unverified"}\``,
  `- Requested model: \`${data.requestedModel ?? "unverified"}\``,
  `- Actual model: \`${data.actualModel ?? "unverified"}\``,
  `- Reasoning setting: \`${data.reasoningSetting ?? "n/a"}\``,
  `- Runs: ${validRuns.length}/${expectedRunCount} valid; ${failedRuns.length} failed`,
  `- Paired runs: ${pairs.length}`,
  `- Token metadata: ${tokenCoverageComplete ? "complete" : "incomplete or unavailable"}`, "",
  "## Overall", "",
  "| Metric | Baseline | Indexed | Reduction |",
  "| --- | ---: | ---: | ---: |",
  `| Pass rate | ${pct(ratioPct(summary.baseline.passRate))} | ${pct(ratioPct(summary.indexed.passRate))} | — |`,
  `| Average deterministic score | ${num(summary.baseline.averageScore)} | ${num(summary.indexed.averageScore)} | — |`,
  `| Median commands | ${num(paired.command_count.baselineMedian)} | ${num(paired.command_count.indexedMedian)} | ${pct(paired.command_count.aggregateMedianReductionPct)} |`,
  `| Median tool output chars | ${num(paired.tool_output_chars.baselineMedian)} | ${num(paired.tool_output_chars.indexedMedian)} | ${pct(paired.tool_output_chars.aggregateMedianReductionPct)} |`,
  `| Median input tokens | ${num(paired.input_tokens.baselineMedian)} | ${num(paired.input_tokens.indexedMedian)} | ${pct(paired.input_tokens.aggregateMedianReductionPct)} |`,
  `| Median uncached input | ${num(paired.uncached_input_tokens.baselineMedian)} | ${num(paired.uncached_input_tokens.indexedMedian)} | ${pct(paired.uncached_input_tokens.aggregateMedianReductionPct)} |`,
  `| Median output tokens | ${num(paired.output_tokens.baselineMedian)} | ${num(paired.output_tokens.indexedMedian)} | ${pct(paired.output_tokens.aggregateMedianReductionPct)} |`,
  `| Median reasoning tokens | ${num(paired.reasoning_output_tokens.baselineMedian)} | ${num(paired.reasoning_output_tokens.indexedMedian)} | ${pct(paired.reasoning_output_tokens.aggregateMedianReductionPct)} |`,
  `| Median duration | ${num(paired.duration_ms.baselineMedian)} ms | ${num(paired.duration_ms.indexedMedian)} ms | ${pct(paired.duration_ms.aggregateMedianReductionPct)} |`, "",
  "## By case", "",
  "| Case | Base pass | Index pass | Base score | Index score | Base input | Index input | Reduction |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...byCase.map((row) => `| ${row.caseId} | ${pct(ratioPct(row.baselinePassRate))} | ${pct(ratioPct(row.indexedPassRate))} | ${num(row.baselineScore)} | ${num(row.indexedScore)} | ${num(row.baselineInputMedian)} | ${num(row.indexedInputMedian)} | ${pct(row.inputReductionPct)} |`),
  "", "## Method", "",
  "The requested model performs the repository-navigation task through the selected native CLI. Scoring is deterministic: expected file groups, forbidden prefixes, path validity, duplicate paths, returned-set precision, and unauthorized workspace changes are checked by code. No LLM judge, token estimate, mock result, or previous report is used.",
  "",
  "A performance conclusion is emitted only for a fully valid run. Missing token metadata is left as `n/a`; it is never replaced with zero or an estimate.", ""
];

fs.writeFileSync(path.join(outDir, "report.md"), lines.join("\n"));
console.log(lines.join("\n"));
console.log(`\nSaved: ${path.join(outDir, "report.md")}`);

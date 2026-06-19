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

function binomialCoefficient(n, k) {
  const edge = Math.min(k, n - k);
  let value = 1;
  for (let i = 1; i <= edge; i += 1) value = (value * (n - edge + i)) / i;
  return value;
}

function exactMcNemar(baselineOnly, indexedOnly) {
  const discordant = baselineOnly + indexedOnly;
  if (!discordant) return { baselineOnly, indexedOnly, discordant, pValue: 1 };
  const lower = Math.min(baselineOnly, indexedOnly);
  let tail = 0;
  for (let k = 0; k <= lower; k += 1) tail += binomialCoefficient(discordant, k) / (2 ** discordant);
  return { baselineOnly, indexedOnly, discordant, pValue: Math.min(1, tail * 2) };
}

const pairedPass = exactMcNemar(
  pairs.filter((pair) => pair.baseline.scoring.pass && !pair.indexed.scoring.pass).length,
  pairs.filter((pair) => !pair.baseline.scoring.pass && pair.indexed.scoring.pass).length
);

const expectedRunCount = Number(data.plannedRuns ?? (Number(data.repeat ?? 0) * Number(data.cases?.length ?? new Set(allRuns.map((run) => run.caseId)).size) * 2));
let status = "FAILED";
if (data.status === "DRY_RUN") status = "DRY_RUN";
else if (data.status === "FAILED_PREFLIGHT_PAIR") status = "FAILED";
else if (failedRuns.length === 0 && validRuns.length > 0 && validRuns.length === expectedRunCount) status = "VALID";
else if (validRuns.length > 0) status = "PARTIAL";

let verdict = "NOT_EVALUATED";
let qualityVerdict = "NOT_EVALUATED";
let efficiencyVerdict = "NOT_EVALUATED";
let tokenCostVerdict = "NOT_EVALUATED";
let efficiencyBalance = null;
let efficiencySignals = [];
if (status === "VALID") {
  const baselinePass = summary.baseline.passRate;
  const indexedPass = summary.indexed.passRate;
  if (Number.isFinite(baselinePass) && Number.isFinite(indexedPass)) {
    if (indexedPass < baselinePass) qualityVerdict = "QUALITY_REGRESSION";
    else if (indexedPass > baselinePass) qualityVerdict = "QUALITY_IMPROVED";
    else qualityVerdict = "QUALITY_NON_INFERIOR";
  }

  const inputComparable = paired.input_tokens.pairs === pairs.length && pairs.length > 0;
  const inputReduction = paired.input_tokens.aggregateMedianReductionPct;
  if (!inputComparable) tokenCostVerdict = "TOTAL_INPUT_UNAVAILABLE";
  else if (inputReduction > 0) tokenCostVerdict = "TOTAL_INPUT_GAIN";
  else if (inputReduction < 0) tokenCostVerdict = "TOTAL_INPUT_REGRESSION";
  else tokenCostVerdict = "TOTAL_INPUT_NEUTRAL";

  const operationalMetrics = [
    "command_count",
    "tool_output_chars",
    "uncached_input_tokens",
    "output_tokens",
    "reasoning_output_tokens",
    "duration_ms"
  ];
  efficiencySignals = operationalMetrics
    .map((metric) => {
      const item = paired[metric];
      if (!item || item.pairs !== pairs.length || pairs.length === 0) return null;
      const reduction = item.aggregateMedianReductionPct;
      if (!Number.isFinite(reduction)) return null;
      return {
        metric,
        reductionPct: reduction,
        direction: reduction > 0 ? "gain" : reduction < 0 ? "regression" : "neutral"
      };
    })
    .filter(Boolean);
  if (!efficiencySignals.length) {
    efficiencyVerdict = "EFFICIENCY_UNAVAILABLE";
  } else {
    efficiencyBalance = efficiencySignals.reduce((sum, signal) => {
      if (signal.direction === "gain") return sum + 1;
      if (signal.direction === "regression") return sum - 1;
      return sum;
    }, 0);
    if (efficiencyBalance >= 2) efficiencyVerdict = "EFFICIENCY_GAIN";
    else if (efficiencyBalance <= -2) efficiencyVerdict = "EFFICIENCY_REGRESSION";
    else efficiencyVerdict = "EFFICIENCY_MIXED";
  }

  if (qualityVerdict === "QUALITY_REGRESSION") verdict = "REGRESSION";
  else if (efficiencyVerdict === "EFFICIENCY_GAIN" && tokenCostVerdict !== "TOTAL_INPUT_REGRESSION") verdict = "IMPROVED";
  else if (efficiencyVerdict === "EFFICIENCY_UNAVAILABLE") verdict = "ACCURACY_ONLY";
  else verdict = "NO_CONFIRMED_IMPROVEMENT";
}

const result = {
  input,
  status,
  verdict,
  qualityVerdict,
  efficiencyVerdict,
  tokenCostVerdict,
  efficiencyBalance,
  efficiencySignals,
  pairedPass,
  runner: data.runner ?? "unverified",
  requestedModel: data.requestedModel ?? null,
  actualModel: data.actualModel ?? null,
  reasoningSetting: data.reasoningSetting ?? null,
  indexingPolicy: data.indexingPolicy ?? null,
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
  `- Quality verdict: ${qualityVerdict}`,
  `- Efficiency verdict: ${efficiencyVerdict}`,
  `- Token cost verdict: ${tokenCostVerdict}`,
  `- Efficiency signal balance: ${efficiencyBalance ?? "n/a"}`,
  `- Runner: \`${data.runner ?? "unverified"}\``,
  `- Requested model: \`${data.requestedModel ?? "unverified"}\``,
  `- Actual model: \`${data.actualModel ?? "unverified"}\``,
  `- Reasoning setting: \`${data.reasoningSetting ?? "n/a"}\``,
  `- Benchmark kind: \`${data.indexingPolicy?.benchmarkKind ?? "legacy/unrecorded"}\``,
  `- Indexing mode: \`${data.indexingPolicy?.requestedMode ?? "legacy/unrecorded"}\``,
  `- Recommended auto level: ${data.indexingPolicy?.recommendedAutoLevel ?? "n/a"}`,
  `- Actual indexed level: ${data.indexingPolicy?.actualIndexedLevel ?? "n/a"}`,
  `- Indexed artifact bytes: ${num(data.indexingPolicy?.indexedArtifactBytes)}`,
  `- Budget profile: \`${data.indexingPolicy?.budgetProfile ?? "legacy/unrecorded"}\``,
  `- Forced for benchmark: ${data.indexingPolicy?.forcedForBenchmark ? "yes" : "no"}`,
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
  "## Paired accuracy check", "",
  `- Baseline-only passes: ${pairedPass.baselineOnly}`,
  `- Indexed-only passes: ${pairedPass.indexedOnly}`,
  `- Exact McNemar two-sided p-value: ${Number.isFinite(pairedPass.pValue) ? pairedPass.pValue.toFixed(4) : "n/a"}`,
  "- The quality verdict is a benchmark gate, not a claim of statistical significance.", "",
  "## By case", "",
  "| Case | Base pass | Index pass | Base score | Index score | Base input | Index input | Reduction |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...byCase.map((row) => `| ${row.caseId} | ${pct(ratioPct(row.baselinePassRate))} | ${pct(ratioPct(row.indexedPassRate))} | ${num(row.baselineScore)} | ${num(row.indexedScore)} | ${num(row.baselineInputMedian)} | ${num(row.indexedInputMedian)} | ${pct(row.inputReductionPct)} |`),
  "", "## Method", "",
  data.indexingPolicy?.note ?? "Indexing activation metadata was not recorded for this legacy run.", "",
  "The requested model performs the repository-navigation task through the selected native CLI. Scoring is deterministic: required concern groups, optional context groups, forbidden prefixes, path validity, duplicate paths, returned-set precision, and unauthorized workspace changes are checked by code. Optional context can improve the score but is never required to pass. No LLM judge, token estimate, mock result, or previous report is used.",
  "",
  "A performance conclusion is emitted only for a fully valid run. Missing token metadata is left as `n/a`; it is never replaced with zero or an estimate.", ""
];

fs.writeFileSync(path.join(outDir, "report.md"), lines.join("\n"));
console.log(lines.join("\n"));
console.log(`\nSaved: ${path.join(outDir, "report.md")}`);

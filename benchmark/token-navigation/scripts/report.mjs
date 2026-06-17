#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ROOT, median, parseArgs, percentChange, readJson, writeJson } from "./lib.mjs";

const args = parseArgs();
function findLatestRuns() {
  const files = [];
  const results = path.join(ROOT, "results");
  if (!fs.existsSync(results)) return null;
  for (const dir of fs.readdirSync(results)) {
    const candidate = path.join(results, dir, "runs.json");
    if (fs.existsSync(candidate)) files.push(candidate);
  }
  return files.toSorted().at(-1) ?? null;
}
const input = path.resolve(String(args.input ?? findLatestRuns() ?? ""));
if (!input || !fs.existsSync(input)) throw new Error("No runs.json found. Run benchmark:codex or pass --input.");
const data = readJson(input);
const validRuns = data.results.filter((run) => !run.dryRun && run.usage && run.scoring);
const variants = ["baseline", "indexed"];
const metrics = ["input_tokens", "uncached_input_tokens", "cached_input_tokens", "output_tokens", "total_tokens"];

const summary = {};
for (const variant of variants) {
  const runs = validRuns.filter((run) => run.variant === variant);
  summary[variant] = {
    runs: runs.length,
    passRate: runs.length ? runs.filter((run) => run.scoring.pass).length / runs.length : null,
    averageScore: runs.length ? runs.reduce((sum, run) => sum + run.scoring.score, 0) / runs.length : null,
    durationMedianMs: median(runs.map((run) => run.durationMs)),
    usageMedian: Object.fromEntries(metrics.map((metric) => [metric, median(runs.map((run) => run.usage[metric]))]))
  };
}

const pairMap = new Map();
for (const run of validRuns) {
  const key = `${run.caseId}::${run.repetition}`;
  if (!pairMap.has(key)) pairMap.set(key, {});
  pairMap.get(key)[run.variant] = run;
}
const pairs = [...pairMap.entries()].filter(([, value]) => value.baseline && value.indexed).map(([key, value]) => ({ key, ...value }));
const paired = {};
for (const metric of metrics) {
  const baselineValues = pairs.map((pair) => pair.baseline.usage[metric]);
  const indexedValues = pairs.map((pair) => pair.indexed.usage[metric]);
  const reductions = pairs.map((pair) => percentChange(pair.baseline.usage[metric], pair.indexed.usage[metric])).filter(Number.isFinite);
  paired[metric] = {
    baselineMedian: median(baselineValues), indexedMedian: median(indexedValues), medianPairReductionPct: median(reductions),
    aggregateMedianReductionPct: percentChange(median(baselineValues), median(indexedValues))
  };
}

const byCase = [];
for (const caseId of [...new Set(validRuns.map((run) => run.caseId))]) {
  const baseline = validRuns.filter((run) => run.caseId === caseId && run.variant === "baseline");
  const indexed = validRuns.filter((run) => run.caseId === caseId && run.variant === "indexed");
  byCase.push({
    caseId,
    baselinePassRate: baseline.length ? baseline.filter((x) => x.scoring.pass).length / baseline.length : null,
    indexedPassRate: indexed.length ? indexed.filter((x) => x.scoring.pass).length / indexed.length : null,
    baselineInputMedian: median(baseline.map((x) => x.usage.input_tokens)),
    indexedInputMedian: median(indexed.map((x) => x.usage.input_tokens)),
    inputReductionPct: percentChange(median(baseline.map((x) => x.usage.input_tokens)), median(indexed.map((x) => x.usage.input_tokens)))
  });
}

const result = { input, model: data.model, repeat: data.repeat, summary, paired, byCase };
const outDir = path.dirname(input);
writeJson(path.join(outDir, "report.json"), result);
const pct = (value) => Number.isFinite(value) ? `${value.toFixed(1)}%` : "n/a";
const num = (value) => Number.isFinite(value) ? Math.round(value).toLocaleString("en-US") : "n/a";
const lines = [
  "# joo-skills token benchmark report", "",
  `- Model: \`${data.model}\``,
  `- Repeats: ${data.repeat}`,
  `- Paired runs: ${pairs.length}`, "",
  "## Overall", "",
  "| Metric | Baseline | Indexed | Reduction |",
  "| --- | ---: | ---: | ---: |",
  `| Pass rate | ${pct(summary.baseline.passRate * 100)} | ${pct(summary.indexed.passRate * 100)} | — |`,
  `| Average score | ${num(summary.baseline.averageScore)} | ${num(summary.indexed.averageScore)} | — |`,
  `| Median input tokens | ${num(paired.input_tokens.baselineMedian)} | ${num(paired.input_tokens.indexedMedian)} | ${pct(paired.input_tokens.aggregateMedianReductionPct)} |`,
  `| Median uncached input | ${num(paired.uncached_input_tokens.baselineMedian)} | ${num(paired.uncached_input_tokens.indexedMedian)} | ${pct(paired.uncached_input_tokens.aggregateMedianReductionPct)} |`,
  `| Median output tokens | ${num(paired.output_tokens.baselineMedian)} | ${num(paired.output_tokens.indexedMedian)} | ${pct(paired.output_tokens.aggregateMedianReductionPct)} |`,
  `| Median duration | ${num(summary.baseline.durationMedianMs)} ms | ${num(summary.indexed.durationMedianMs)} ms | ${pct(percentChange(summary.baseline.durationMedianMs, summary.indexed.durationMedianMs))} |`,
  "", "## By case", "",
  "| Case | Base pass | Index pass | Base input | Index input | Reduction |",
  "| --- | ---: | ---: | ---: | ---: | ---: |",
  ...byCase.map((row) => `| ${row.caseId} | ${pct(row.baselinePassRate * 100)} | ${pct(row.indexedPassRate * 100)} | ${num(row.baselineInputMedian)} | ${num(row.indexedInputMedian)} | ${pct(row.inputReductionPct)} |`),
  "", "## Interpretation", "",
  "Treat the index as beneficial only when indexed pass rate is not worse and token reduction is positive across several navigation-heavy cases. The exact-path control should show little or no improvement; a large gain there may indicate uncontrolled variance. Cached input is reported separately because it can make cost and context-size conclusions differ.", ""
];
fs.writeFileSync(path.join(outDir, "report.md"), lines.join("\n"));
console.log(lines.join("\n"));
console.log(`\nSaved: ${path.join(outDir, "report.md")}`);

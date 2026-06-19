#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "joo-report-check-"));
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const reportScript = path.join(scriptDir, "report.mjs");

function run(id, variant, usage, metrics, scoring) {
  return {
    id: `${id}-${variant}`,
    caseId: id,
    repetition: 1,
    variant,
    infrastructureValid: true,
    executionValid: true,
    scoring,
    durationMs: metrics.durationMs,
    executionMetrics: {
      commandCount: metrics.commandCount,
      toolOutputChars: metrics.toolOutputChars
    },
    usage
  };
}

const runs = {
  status: "COMPLETE",
  runner: "self-check",
  requestedModel: "synthetic",
  actualModel: "synthetic",
  reasoningSetting: "medium",
  repeat: 1,
  plannedRuns: 4,
  cases: [{ id: "a" }, { id: "b" }],
  results: [
    run("a", "baseline", {
      input_tokens: 80_000,
      uncached_input_tokens: 30_000,
      output_tokens: 1_000,
      reasoning_output_tokens: 200,
      total_tokens: 81_200
    }, {
      durationMs: 30_000,
      commandCount: 6,
      toolOutputChars: 14_000
    }, { pass: true, score: 90 }),
    run("a", "indexed", {
      input_tokens: 100_000,
      uncached_input_tokens: 25_000,
      output_tokens: 700,
      reasoning_output_tokens: 100,
      total_tokens: 100_800
    }, {
      durationMs: 24_000,
      commandCount: 4,
      toolOutputChars: 4_000
    }, { pass: true, score: 100 }),
    run("b", "baseline", {
      input_tokens: 82_000,
      uncached_input_tokens: 31_000,
      output_tokens: 1_100,
      reasoning_output_tokens: 220,
      total_tokens: 83_320
    }, {
      durationMs: 32_000,
      commandCount: 7,
      toolOutputChars: 16_000
    }, { pass: true, score: 90 }),
    run("b", "indexed", {
      input_tokens: 101_000,
      uncached_input_tokens: 26_000,
      output_tokens: 800,
      reasoning_output_tokens: 120,
      total_tokens: 101_920
    }, {
      durationMs: 25_000,
      commandCount: 4,
      toolOutputChars: 4_500
    }, { pass: true, score: 100 })
  ]
};

const input = path.join(tempRoot, "runs.json");
fs.writeFileSync(input, `${JSON.stringify(runs, null, 2)}\n`);

try {
  const result = spawnSync(process.execPath, [reportScript, "--input", input], {
    cwd: path.dirname(scriptDir),
    encoding: "utf8",
    timeout: 30_000
  });

  if (result.error || result.status !== 0) {
    throw new Error(`report self-check failed to run: ${result.error?.message ?? result.stderr}`);
  }

  const report = JSON.parse(fs.readFileSync(path.join(tempRoot, "report.json"), "utf8"));
  const errors = [];
  if (report.efficiencyVerdict !== "EFFICIENCY_GAIN") {
    errors.push(`expected operational efficiency gain, got ${report.efficiencyVerdict}`);
  }
  if (report.tokenCostVerdict !== "TOTAL_INPUT_REGRESSION") {
    errors.push(`expected total input regression, got ${report.tokenCostVerdict}`);
  }
  if (report.verdict !== "NO_CONFIRMED_IMPROVEMENT") {
    errors.push(`expected conservative overall verdict, got ${report.verdict}`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log("OK: report verdict self-check");

#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, readJson, writeJson } from "./lib.mjs";

function makeRun({ id, caseId, category, repetition, variant, pass, score, confirmed = false, action = "ignore", input = 1000, output = 100, duration = 1000 }) {
  return {
    id, caseId, category, repetition, variant,
    infrastructureValid: true,
    durationMs: duration,
    usage: { input_tokens: input, output_tokens: output },
    executionMetrics: { commandCount: 0, toolOutputChars: 0 },
    answer: { confirmed, action, promotion: "no" },
    scoring: { pass, score, checks: { promotion: true } }
  };
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "joo-feedback-report-"));
try {
  const runs = {
    status: "COMPLETE",
    runner: "codex",
    requestedModel: "test",
    actualModel: "test",
    repeat: 1,
    plannedRuns: 4,
    results: [
      makeRun({ id: "b1", caseId: "positive", category: "positive", repetition: 1, variant: "baseline", pass: false, score: 60, input: 1200 }),
      makeRun({ id: "s1", caseId: "positive", category: "positive", repetition: 1, variant: "skilled", pass: true, score: 95, input: 1300, confirmed: true, action: "create-incident" }),
      makeRun({ id: "b2", caseId: "negative", category: "negative-control", repetition: 1, variant: "baseline", pass: false, score: 70, input: 1000, confirmed: true, action: "create-incident" }),
      makeRun({ id: "s2", caseId: "negative", category: "negative-control", repetition: 1, variant: "skilled", pass: true, score: 100, input: 1100 })
    ]
  };
  const file = path.join(temp, "runs.json");
  writeJson(file, runs);
  const child = spawnSync(process.execPath, [path.join(ROOT, "scripts", "report.mjs"), "--input", file], { encoding: "utf8" });
  if (child.status !== 0) throw new Error(child.stderr || child.stdout || "report failed");
  const report = readJson(path.join(temp, "report.json"));
  if (report.status !== "VALID") throw new Error(`expected VALID, got ${report.status}`);
  if (report.verdict !== "SAFE_TO_SHADOW") throw new Error(`expected SAFE_TO_SHADOW, got ${report.verdict}`);
  if (report.summary.skilled.falseIncidentRate !== 0) throw new Error("skilled false incident rate should be zero");
  console.log("OK: feedback report verdict self-check");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

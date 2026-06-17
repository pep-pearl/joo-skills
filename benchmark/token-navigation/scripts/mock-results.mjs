#!/usr/bin/env node
import path from "node:path";
import { ROOT, readJson, writeJson } from "./lib.mjs";
const cases = readJson(path.join(ROOT, "benchmark", "cases.json")).cases;
const dir = path.join(ROOT, "results", "mock");
const results = [];
for (let repetition = 1; repetition <= 3; repetition += 1) {
  for (const [caseIndex, testCase] of cases.entries()) {
    for (const variant of ["baseline", "indexed"]) {
      const exact = testCase.id === "exact-path-control";
      const base = 9000 + caseIndex * 280 + repetition * 75;
      const input = variant === "baseline" ? base : Math.round(base * (exact ? 0.98 : 0.64));
      results.push({
        variant, caseId: testCase.id, repetition, model: "mock-model", durationMs: variant === "baseline" ? 6000 : 4300,
        usage: { input_tokens: input, cached_input_tokens: 0, uncached_input_tokens: input, output_tokens: 180, reasoning_output_tokens: 60, total_tokens: input + 180 },
        scoring: { pass: true, score: 100, returned: testCase.expectedGroups.map((group) => group[0]), forbiddenHits: [] }
      });
    }
  }
}
writeJson(path.join(dir, "runs.json"), { createdAt: new Date().toISOString(), model: "mock-model", repeat: 3, results });
console.log(path.join(dir, "runs.json"));

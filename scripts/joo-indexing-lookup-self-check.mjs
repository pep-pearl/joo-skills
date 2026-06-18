#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = path.join(root, "benchmark", "token-navigation", "fixture");
const overlay = path.join(root, "benchmark", "token-navigation", "variants", "indexed");
const casesFile = path.join(root, "benchmark", "token-navigation", "benchmark", "cases.json");
const lookup = path.join(root, "scripts", "joo-indexing-lookup.mjs");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "joo-lookup-check-"));

function normalize(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\.\//, "");
}

try {
  fs.cpSync(fixture, temp, { recursive: true });
  fs.cpSync(overlay, temp, { recursive: true });
  const cases = JSON.parse(fs.readFileSync(casesFile, "utf8")).cases;
  const failures = [];

  for (const testCase of cases) {
    const stdout = execFileSync(process.execPath, [
      lookup,
      "--target", temp,
      "--keyword", testCase.prompt,
      "--limit", "5",
      "--json"
    ], { encoding: "utf8" });
    const result = JSON.parse(stdout);
    const suggested = new Set((result.suggestedNextRead ?? []).map(normalize));
    const requiredGroups = testCase.requiredGroups ?? testCase.expectedGroups ?? [];
    const missing = requiredGroups.filter((group) => !group.some((file) => suggested.has(normalize(file))));
    if (missing.length || (result.uncoveredConcerns ?? []).length) {
      failures.push({
        id: testCase.id,
        missing,
        uncoveredConcerns: result.uncoveredConcerns ?? [],
        suggested: [...suggested]
      });
    }
  }

  if (failures.length) {
    console.error(JSON.stringify({ status: "FAILED", failures }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`OK: lookup covers required groups for ${cases.length} benchmark cases`);
  }
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

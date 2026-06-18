#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ROOT, readJson, normalizePath } from "./lib.mjs";

const fixtureRoot = path.join(ROOT, "fixture");
const overlayRoot = path.join(ROOT, "variants", "indexed");
const cases = readJson(path.join(ROOT, "benchmark", "cases.json")).cases;

if (!Array.isArray(cases) || cases.length === 0) throw new Error("Benchmark cases are empty");

const ids = new Set();
const errors = [];
for (const testCase of cases) {
  if (!testCase.id || ids.has(testCase.id)) errors.push(`Invalid or duplicate case id: ${testCase.id ?? "<missing>"}`);
  ids.add(testCase.id);
  if (!String(testCase.prompt ?? "").trim()) errors.push(`${testCase.id}: prompt is empty`);
  if (!Array.isArray(testCase.expectedGroups) || testCase.expectedGroups.length === 0) {
    errors.push(`${testCase.id}: expectedGroups is empty`);
    continue;
  }

  const forbidden = (testCase.forbiddenPrefixes ?? []).map(normalizePath);
  for (const group of testCase.expectedGroups) {
    if (!Array.isArray(group) || group.length === 0) {
      errors.push(`${testCase.id}: expected group is empty`);
      continue;
    }
    for (const file of group) {
      const normalized = normalizePath(file);
      const absolute = path.join(fixtureRoot, normalized);
      if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) errors.push(`${testCase.id}: missing expected file ${normalized}`);
      if (forbidden.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
        errors.push(`${testCase.id}: expected file is also forbidden: ${normalized}`);
      }
    }
  }
}

const baselineLeaks = [
  path.join(fixtureRoot, "AI_INDEX.md"),
  path.join(fixtureRoot, "AGENTS.md"),
  path.join(fixtureRoot, ".ai")
].filter(fs.existsSync);
if (baselineLeaks.length) errors.push(`Baseline fixture contains navigation metadata: ${baselineLeaks.join(", ")}`);

const requiredOverlay = [
  path.join(overlayRoot, "AI_INDEX.md"),
  path.join(overlayRoot, "AGENTS.md"),
  path.join(overlayRoot, ".ai", "indexing", "maps")
];
for (const file of requiredOverlay) {
  if (!fs.existsSync(file)) errors.push(`Indexed overlay is incomplete: ${file}`);
}

const allowedOverlayTopLevel = new Set(["AI_INDEX.md", "AGENTS.md", ".ai", "rules"]);
if (fs.existsSync(overlayRoot)) {
  for (const entry of fs.readdirSync(overlayRoot)) {
    if (!allowedOverlayTopLevel.has(entry)) errors.push(`Indexed overlay contains non-metadata entry: ${entry}`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

function walkFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(full));
    else files.push(full);
  }
  return files;
}

const sourceFiles = walkFiles(fixtureRoot);
const metadataFiles = walkFiles(overlayRoot);
const bytes = (files) => files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
console.log(`OK: ${cases.length} cases`);
console.log(`Fixture: ${sourceFiles.length} files, ${bytes(sourceFiles)} bytes`);
console.log(`Indexed metadata: ${metadataFiles.length} files, ${bytes(metadataFiles)} bytes`);

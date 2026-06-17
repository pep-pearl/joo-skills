#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ROOT, readJson, normalizePath } from "./lib.mjs";

const cases = readJson(path.join(ROOT, "benchmark", "cases.json")).cases;
const missing = [];
for (const testCase of cases) {
  for (const group of testCase.expectedGroups ?? []) {
    for (const file of group) {
      const normalized = normalizePath(file);
      if (!fs.existsSync(path.join(ROOT, "fixture", normalized))) missing.push(`${testCase.id}: ${normalized}`);
    }
  }
}
if (missing.length) {
  console.error("Missing expected fixture files:\n" + missing.map((x) => `- ${x}`).join("\n"));
  process.exit(1);
}
const aiIndex = path.join(ROOT, "variants", "indexed", "AI_INDEX.md");
const maps = path.join(ROOT, "variants", "indexed", ".ai", "indexing", "maps");
if (!fs.existsSync(aiIndex) || !fs.existsSync(maps)) throw new Error("Indexed overlay is incomplete");
const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full); else sourceFiles.push(full);
  }
}
walk(path.join(ROOT, "fixture"));
const metadataFiles = [];
function walkMeta(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMeta(full); else metadataFiles.push(full);
  }
}
walkMeta(path.join(ROOT, "variants", "indexed"));
const bytes = (files) => files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
console.log(`OK: ${cases.length} cases`);
console.log(`Fixture: ${sourceFiles.length} files, ${bytes(sourceFiles)} bytes`);
console.log(`Indexed metadata: ${metadataFiles.length} files, ${bytes(metadataFiles)} bytes`);

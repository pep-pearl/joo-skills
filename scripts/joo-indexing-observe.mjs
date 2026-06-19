#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
function getArg(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : fallback;
}
function getArgs(name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1] !== undefined) values.push(args[index + 1]);
  }
  return values.flatMap((value) => String(value).split(",")).map((value) => value.trim()).filter(Boolean);
}
function hasFlag(name) { return args.includes(name); }
function numberArg(name, fallback = 0) {
  const value = Number(getArg(name, fallback));
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a non-negative number`);
  return value;
}

const target = path.resolve(getArg("--target", "."));
const outputPath = path.join(target, ".ai", "indexing", "local-usage.json");
const maxRuns = Math.max(3, Number(getArg("--max-runs", "50")));
let data = { schemaVersion: 2, localOnly: true, runs: [] };
try {
  const parsed = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  if (Array.isArray(parsed.runs)) data = { ...data, ...parsed, schemaVersion: 2, runs: parsed.runs };
} catch { /* first local observation */ }

const event = {
  recordedAt: new Date().toISOString(),
  commandCount: numberArg("--commands"),
  toolOutputChars: numberArg("--tool-output-chars"),
  broadSearch: hasFlag("--broad-search"),
  wrongCandidates: numberArg("--wrong-candidates"),
  files: getArgs("--file"),
  domains: getArgs("--domain"),
  concerns: getArgs("--concern"),
  hadError: hasFlag("--error"),
  failedTest: hasFlag("--failed-test"),
  indexUsed: hasFlag("--index-used"),
  savedChars: numberArg("--saved-chars"),
  indexReadChars: numberArg("--index-read-chars"),
  maintenanceChars: numberArg("--maintenance-chars")
};

data.runs.push(event);
data.runs = data.runs.slice(-maxRuns);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
const localExclude = path.join(target, ".git", "info", "exclude");
if (fs.existsSync(path.dirname(localExclude))) {
  const ignoreLines = [
    ".ai/indexing/local-usage.json",
    ".ai/indexing/priority-state.json",
    ".ai/indexing/assessment-state.json"
  ];
  let existing = "";
  try { existing = fs.readFileSync(localExclude, "utf8"); } catch { /* ignore */ }
  const current = new Set(existing.split(/\r?\n/));
  const additions = ignoreLines.filter((line) => !current.has(line));
  if (additions.length) {
    fs.appendFileSync(localExclude, `${existing && !existing.endsWith("\n") ? "\n" : ""}${additions.join("\n")}\n`, "utf8");
  }
}
console.log(`Recorded local navigation observation: ${outputPath}`);
console.log(`Samples retained: ${data.runs.length}`);
if (event.files.length || event.domains.length || event.concerns.length) {
  console.log(`Priority signals: ${event.files.length} files, ${event.domains.length} domains, ${event.concerns.length} concerns`);
}
if (event.savedChars || event.indexReadChars || event.maintenanceChars) {
  const cost = event.indexReadChars + event.maintenanceChars;
  console.log(`ROI sample: benefit=${event.savedChars} chars, cost=${cost} chars`);
}

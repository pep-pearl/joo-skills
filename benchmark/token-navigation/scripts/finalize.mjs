#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, parseArgs, readJson, writeJson } from "./lib.mjs";

const args = parseArgs();
const invocationCwd = process.env.INIT_CWD || process.cwd();

function latestResultDir() {
  const resultsRoot = path.join(ROOT, "results");
  const dirs = fs.readdirSync(resultsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(resultsRoot, entry.name))
    .filter((dir) => fs.existsSync(path.join(dir, "runs.partial.json")) || fs.existsSync(path.join(dir, "runs.json")))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  const partial = dirs.filter((dir) => fs.existsSync(path.join(dir, "runs.partial.json")));
  if (partial.length) return partial[0];
  return dirs[0] ?? null;
}

const requested = args.input ?? args.dir ?? "latest";
const resultDir = requested === "latest"
  ? latestResultDir()
  : path.resolve(invocationCwd, String(requested));
if (!resultDir || !fs.existsSync(resultDir)) {
  console.error("BENCHMARK_NOT_RUN: No benchmark result directory found to finalize.");
  process.exit(1);
}

const source = fs.existsSync(path.join(resultDir, "runs.json"))
  ? path.join(resultDir, "runs.json")
  : path.join(resultDir, "runs.partial.json");
const data = readJson(source);
const status = data.status === "RUNNING" ? "INTERRUPTED" : data.status;
writeJson(path.join(resultDir, "runs.json"), { ...data, status, finalizedAt: new Date().toISOString() });

const report = spawnSync(process.execPath, [path.join(ROOT, "scripts", "report.mjs"), "--input", path.join(resultDir, "runs.json")], {
  stdio: "inherit"
});
process.exit(report.status ?? 0);

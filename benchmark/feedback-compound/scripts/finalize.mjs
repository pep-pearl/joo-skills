#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, parseArgs, readJson, writeJson } from "./lib.mjs";

const args = parseArgs();
const resultsRoot = path.join(ROOT, "results");
function latest() {
  if (!fs.existsSync(resultsRoot)) return null;
  return fs.readdirSync(resultsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => path.join(resultsRoot, entry.name)).filter((dir) => fs.existsSync(path.join(dir, "runs.partial.json")) || fs.existsSync(path.join(dir, "runs.json"))).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] ?? null;
}
const requested = args.dir ?? args.input ?? "latest";
const dir = requested === "latest" ? latest() : path.resolve(String(requested));
if (!dir) { console.error("BENCHMARK_NOT_RUN: no result directory"); process.exit(1); }
const source = fs.existsSync(path.join(dir, "runs.json")) ? path.join(dir, "runs.json") : path.join(dir, "runs.partial.json");
const data = readJson(source);
writeJson(path.join(dir, "runs.json"), { ...data, status: data.status === "RUNNING" ? "INTERRUPTED" : data.status, finalizedAt: new Date().toISOString() });
const child = spawnSync(process.execPath, [path.join(ROOT, "scripts", "report.mjs"), "--input", path.join(dir, "runs.json")], { stdio: "inherit" });
process.exit(child.status ?? 0);

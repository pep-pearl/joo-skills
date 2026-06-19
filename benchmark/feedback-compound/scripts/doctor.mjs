#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseArgs } from "./lib.mjs";

const args = parseArgs();
const runner = String(args.runner ?? process.env.BENCHMARK_RUNNER ?? "auto").toLowerCase();
if (!["auto", "agy", "codex"].includes(runner)) {
  console.error(`BENCHMARK_NOT_RUN: unsupported runner ${runner}`);
  process.exit(1);
}

function quote(value) { return `"${String(value).replaceAll('"', '""')}"`; }
function run(bin, argv) {
  const options = { encoding: "utf8", windowsHide: true, timeout: 30_000 };
  if (process.platform === "win32" && String(bin).toLowerCase().endsWith(".cmd")) {
    return spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", ["call", quote(bin), ...argv.map(quote)].join(" ")], { ...options, windowsVerbatimArguments: true });
  }
  return spawnSync(bin, argv, options);
}
function find(candidates) {
  for (const candidate of candidates.filter(Boolean)) {
    if ((path.isAbsolute(candidate) || candidate.includes("/") || candidate.includes("\\")) && !fs.existsSync(candidate)) continue;
    const result = run(candidate, ["--version"]);
    if (!result.error && result.status === 0) return { candidate, result };
  }
  return null;
}

const rows = [["Node.js", process.version, Number(process.versions.node.split(".")[0]) >= 20]];
if (runner !== "codex") {
  const local = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "agy", "bin", "agy.exe") : null;
  const found = find([process.env.AGY_BIN, local, process.platform === "win32" ? "agy.exe" : "agy", "agy"]);
  rows.push(["Antigravity CLI", found ? `${found.candidate} (${String(found.result.stdout || found.result.stderr).trim()})` : "not found", Boolean(found)]);
}
if (runner !== "agy") {
  const found = find([process.env.CODEX_BIN, process.platform === "win32" ? "codex.cmd" : "codex", "codex"]);
  rows.push(["Codex CLI", found ? `${found.candidate} (${String(found.result.stdout || found.result.stderr).trim()})` : "not found", Boolean(found)]);
}
const width = Math.max(...rows.map(([name]) => name.length));
for (const [name, value, ok] of rows) console.log(`${name.padEnd(width)}  [${ok ? "OK" : "FAIL"}] ${value}`);
if (rows.some(([, , ok]) => !ok)) process.exitCode = 1;

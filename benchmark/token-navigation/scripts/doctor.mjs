#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function argValue(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

const requestedRunner = String(argValue("runner") ?? process.env.BENCHMARK_RUNNER ?? "auto").trim().toLowerCase();
if (!["auto", "agy", "codex"].includes(requestedRunner)) {
  console.error(`BENCHMARK_NOT_RUN: Unsupported runner "${requestedRunner}". Use auto, agy, or codex.`);
  process.exit(1);
}
const checkAgy = requestedRunner !== "codex";
const checkCodex = requestedRunner !== "agy";

function quoteCmd(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function run(bin, args) {
  const options = { encoding: "utf8", windowsHide: true, timeout: 30_000 };
  if (process.platform === "win32" && String(bin).toLowerCase().endsWith(".cmd")) {
    return spawnSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/s", "/c", ["call", quoteCmd(bin), ...args.map(quoteCmd)].join(" ")],
      { ...options, windowsVerbatimArguments: true }
    );
  }
  return spawnSync(bin, args, options);
}

function firstWorking(candidates, args = ["--version"]) {
  for (const candidate of [...new Set(candidates.filter(Boolean))]) {
    if ((path.isAbsolute(candidate) || candidate.includes("/") || candidate.includes("\\")) && !fs.existsSync(candidate)) continue;
    const result = run(candidate, args);
    if (!result.error && result.status === 0) return { bin: candidate, result };
  }
  return { bin: null, result: null };
}

const rows = [];
rows.push(["Node.js", process.version, Number(process.versions.node.split(".")[0]) >= 20 ? "OK" : "FAIL"]);
let hasFailure = Number(process.versions.node.split(".")[0]) < 20;

const localAppDataAgy = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, "agy", "bin", "agy.exe")
  : null;
const agyCandidates = [process.env.AGY_BIN, localAppDataAgy, process.platform === "win32" ? "agy.exe" : "agy", "agy"].filter(Boolean);
let agy = null;
if (checkAgy) {
  const found = firstWorking(agyCandidates);
  agy = found.bin;
  const agyVersion = found.result ? String(found.result.stdout || found.result.stderr).trim() : null;
  rows.push(["Antigravity CLI", agy ? `${agy} (${agyVersion || "version unknown"})` : "not found", agy ? "OK" : "FAIL"]);
  if (!agy) hasFailure = true;

  if (agy) {
    const models = run(agy, ["models"]);
    const ok = models.status === 0;
    rows.push(["agy models", ok ? "available" : String(models.stderr || models.error?.message || `exit ${models.status}`).trim(), ok ? "OK" : "FAIL"]);
    if (!ok) hasFailure = true;
  }
}

const codexCandidates = [
  process.env.CODEX_BIN,
  process.platform === "win32" ? "codex.cmd" : "codex",
  "codex"
];
let codex = null;
if (checkCodex) {
  const found = firstWorking(codexCandidates);
  codex = found.bin;
  const codexVersion = found.result ? String(found.result.stdout || found.result.stderr).trim() : null;
  rows.push(["Codex CLI", codex ? `${codex} (${codexVersion || "version unknown"})` : "not found", codex ? "OK" : "FAIL"]);
  if (!codex) hasFailure = true;

  if (codex) {
    const help = run(codex, ["exec", "--help"]);
    const ok = help.status === 0;
    rows.push(["codex exec", ok ? "available" : String(help.stderr || help.error?.message || `exit ${help.status}`).trim(), ok ? "OK" : "FAIL"]);
    if (!ok) hasFailure = true;
  }
}

const width = Math.max(...rows.map(([name]) => name.length));
for (const [name, value, status] of rows) console.log(`${name.padEnd(width)}  [${status}] ${value}`);

if (checkAgy && !agy && process.platform === "win32") {
  console.log("\nExpected Windows install path:");
  console.log(`  ${localAppDataAgy ?? "%LOCALAPPDATA%\\agy\\bin\\agy.exe"}`);
  console.log("\nInstall or repair from PowerShell:");
  console.log("  irm https://antigravity.google/cli/install.ps1 | iex");
}

if (checkAgy && agy && process.env.MSYSTEM && localAppDataAgy && fs.existsSync(localAppDataAgy)) {
  console.log("\nGit Bash PATH repair:");
  console.log("  source scripts/setup-agy-git-bash.sh");
}

if (hasFailure) process.exitCode = 1;

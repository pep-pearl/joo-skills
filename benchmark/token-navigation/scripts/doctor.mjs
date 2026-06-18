#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function run(bin, args) {
  return spawnSync(bin, args, { encoding: "utf8", windowsHide: true, timeout: 30_000 });
}

const rows = [];
rows.push(["Node.js", process.version, Number(process.versions.node.split(".")[0]) >= 20 ? "OK" : "FAIL"]);

const localAppDataAgy = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, "agy", "bin", "agy.exe")
  : null;
const agyCandidates = [process.env.AGY_BIN, localAppDataAgy, process.platform === "win32" ? "agy.exe" : "agy", "agy"].filter(Boolean);
let agy = null;
let agyVersion = null;
for (const candidate of [...new Set(agyCandidates)]) {
  if ((path.isAbsolute(candidate) || candidate.includes("/") || candidate.includes("\\")) && !fs.existsSync(candidate)) continue;
  const result = run(candidate, ["--version"]);
  if (!result.error && result.status === 0) {
    agy = candidate;
    agyVersion = String(result.stdout || result.stderr).trim();
    break;
  }
}
rows.push(["Antigravity CLI", agy ? `${agy} (${agyVersion || "version unknown"})` : "not found", agy ? "OK" : "FAIL"]);

if (agy) {
  const models = run(agy, ["models"]);
  rows.push(["agy models", models.status === 0 ? "available" : String(models.stderr || models.error?.message || `exit ${models.status}`).trim(), models.status === 0 ? "OK" : "FAIL"]);
}

const width = Math.max(...rows.map(([name]) => name.length));
for (const [name, value, status] of rows) console.log(`${name.padEnd(width)}  [${status}] ${value}`);

if (!agy && process.platform === "win32") {
  console.log("\nExpected Windows install path:");
  console.log(`  ${localAppDataAgy ?? "%LOCALAPPDATA%\\agy\\bin\\agy.exe"}`);
  console.log("\nInstall or repair from PowerShell:");
  console.log("  irm https://antigravity.google/cli/install.ps1 | iex");
}

if (agy && process.env.MSYSTEM && localAppDataAgy && fs.existsSync(localAppDataAgy)) {
  console.log("\nGit Bash PATH repair:");
  console.log("  source scripts/setup-agy-git-bash.sh");
}

if (!agy) process.exitCode = 1;

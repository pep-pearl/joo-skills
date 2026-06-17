#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, copyTree, parseArgs, resetDir } from "./lib.mjs";

const args = parseArgs();
const joo = path.resolve(String(args.path ?? process.env.JOO_SKILLS_PATH ?? ""));
if (!joo || !fs.existsSync(joo)) throw new Error("Pass --path /absolute/path/to/joo-skills or set JOO_SKILLS_PATH");
const target = path.resolve(String(args.out ?? path.join(ROOT, ".work", "joo-generated")));
resetDir(target);
copyTree(path.join(ROOT, "fixture"), target);
function run(script, extra) {
  const result = spawnSync(process.execPath, [path.join(joo, "scripts", script), ...extra], { cwd: target, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${script} failed with ${result.status}`);
}
run("joo-indexing-install.mjs", ["--target", target, "--force"]);
run("joo-indexing-scan.mjs", ["--target", target, "--out", path.join(target, ".ai", "indexing")]);
const candidate = path.join(target, ".ai", "indexing", "AI_INDEX.candidate.md");
if (fs.existsSync(candidate)) fs.copyFileSync(candidate, path.join(target, "AI_INDEX.md"));
console.log(`Generated indexed workspace: ${target}`);
console.log("Review AI_INDEX.md before using it for a production-quality benchmark.");

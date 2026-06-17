#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, copyTree, ensureDir, normalizePath, parseArgs, readJson, resetDir, writeJson } from "./lib.mjs";

const args = parseArgs();
const model = String(args.model ?? process.env.CODEX_MODEL ?? "gpt-5.5");
const repeat = Math.max(1, Number(args.repeat ?? 3));
const caseFilter = args.case ? new Set(String(args.case).split(",")) : null;
const maxCases = args["max-cases"] ? Number(args["max-cases"]) : null;
const dryRun = Boolean(args["dry-run"]);
const keepWork = Boolean(args["keep-work"]);
const baselineTemplate = path.resolve(String(args["baseline-workspace"] ?? path.join(ROOT, "fixture")));
const indexedTemplate = args["indexed-workspace"] ? path.resolve(String(args["indexed-workspace"])) : null;
const casesFile = path.resolve(String(args.cases ?? path.join(ROOT, "benchmark", "cases.json")));
const schemaFile = path.resolve(String(args.schema ?? path.join(ROOT, "benchmark", "output-schema.json")));
let cases = readJson(casesFile).cases;
if (caseFilter) cases = cases.filter((item) => caseFilter.has(item.id));
if (Number.isFinite(maxCases)) cases = cases.slice(0, maxCases);
if (!cases.length) throw new Error("No benchmark cases selected");

const runStamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const resultDir = path.join(ROOT, "results", runStamp);
const workRoot = path.join(ROOT, ".work", runStamp);
ensureDir(resultDir);
ensureDir(workRoot);

function materialize(variant, target) {
  resetDir(target);
  if (variant === "baseline") {
    copyTree(baselineTemplate, target);
    return;
  }
  if (indexedTemplate) {
    copyTree(indexedTemplate, target);
    return;
  }
  copyTree(baselineTemplate, target);
  copyTree(path.join(ROOT, "variants", "indexed"), target);
}

function buildPrompt(testCase) {
  return [
    "You are running a read-only repository navigation benchmark.",
    "Do not modify files and do not run network commands.",
    "Find the smallest useful set of 1-4 current production source files that are the best entry points for the task.",
    "Return repository-relative paths. Prefer active app code over legacy, archive, examples, playground, Storybook, generated clients, or tests unless explicitly requested.",
    "Do not return directories.",
    `Task: ${testCase.prompt}`
  ].join("\n");
}

function parseJsonl(stdout) {
  const events = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { /* retain raw log separately */ }
  }
  return events;
}

function extractUsage(events) {
  const completed = events.filter((event) => event?.type === "turn.completed" && event.usage);
  const usage = completed.reduce((sum, event) => ({
    input_tokens: sum.input_tokens + Number(event.usage.input_tokens ?? 0),
    cached_input_tokens: sum.cached_input_tokens + Number(event.usage.cached_input_tokens ?? 0),
    output_tokens: sum.output_tokens + Number(event.usage.output_tokens ?? 0),
    reasoning_output_tokens: sum.reasoning_output_tokens + Number(event.usage.reasoning_output_tokens ?? 0)
  }), { input_tokens: 0, cached_input_tokens: 0, output_tokens: 0, reasoning_output_tokens: 0 });
  usage.uncached_input_tokens = Math.max(0, usage.input_tokens - usage.cached_input_tokens);
  usage.total_tokens = usage.input_tokens + usage.output_tokens;
  return usage;
}

function score(testCase, answer) {
  const returned = (answer?.entryFiles ?? []).map(normalizePath);
  const groups = testCase.expectedGroups ?? [];
  const groupHits = groups.map((group) => group.some((file) => returned.includes(normalizePath(file))));
  const forbidden = (testCase.forbiddenPrefixes ?? []).map(normalizePath);
  const forbiddenHits = returned.filter((file) => forbidden.some((prefix) => file === prefix || file.startsWith(prefix)));
  const hitCount = groupHits.filter(Boolean).length;
  const score = groups.length ? Math.round((hitCount / groups.length) * 100) : 100;
  return { returned, groupHits, forbiddenHits, score: forbiddenHits.length ? Math.max(0, score - 50) : score, pass: hitCount === groups.length && forbiddenHits.length === 0 };
}

function runOne(variant, testCase, repetition) {
  const id = `${String(repetition).padStart(2, "0")}-${variant}-${testCase.id}`;
  const workspace = path.join(workRoot, id);
  materialize(variant, workspace);
  const finalFile = path.join(resultDir, `${id}.answer.json`);
  const logFile = path.join(resultDir, `${id}.jsonl`);
  const prompt = buildPrompt(testCase);
  const codexArgs = [
    "exec", "--json", "--ephemeral", "--sandbox", "read-only", "--skip-git-repo-check",
    "--model", model, "--cd", workspace, "--output-schema", schemaFile,
    "--output-last-message", finalFile, prompt
  ];
  console.log(`[${variant}] ${testCase.id} (repeat ${repetition}/${repeat})`);
  if (dryRun) return { id, variant, caseId: testCase.id, repetition, dryRun: true, command: ["codex", ...codexArgs] };
  const startedAt = Date.now();
  const child = spawnSync("codex", codexArgs, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const durationMs = Date.now() - startedAt;
  fs.writeFileSync(logFile, child.stdout ?? "", "utf8");
  if (child.stderr) fs.writeFileSync(path.join(resultDir, `${id}.stderr.txt`), child.stderr, "utf8");
  const events = parseJsonl(child.stdout ?? "");
  let answer = null;
  let answerError = null;
  try { answer = JSON.parse(fs.readFileSync(finalFile, "utf8")); } catch (error) { answerError = error.message; }
  const scoring = score(testCase, answer);
  if (!keepWork) fs.rmSync(workspace, { recursive: true, force: true });
  return {
    id, variant, caseId: testCase.id, repetition, model, durationMs,
    exitCode: child.status, signal: child.signal, answerError,
    usage: extractUsage(events), answer, scoring,
    eventCounts: events.reduce((acc, event) => { acc[event.type] = (acc[event.type] ?? 0) + 1; return acc; }, {})
  };
}

const results = [];
for (let repetition = 1; repetition <= repeat; repetition += 1) {
  const order = repetition % 2 === 1 ? ["baseline", "indexed"] : ["indexed", "baseline"];
  for (const testCase of cases) {
    for (const variant of order) {
      const result = runOne(variant, testCase, repetition);
      results.push(result);
      writeJson(path.join(resultDir, "runs.partial.json"), { model, repeat, cases: cases.map((x) => x.id), results });
    }
  }
}
const output = { createdAt: new Date().toISOString(), model, repeat, casesFile, results };
writeJson(path.join(resultDir, "runs.json"), output);
console.log(`\nSaved: ${path.join(resultDir, "runs.json")}`);
if (!dryRun) {
  const report = spawnSync(process.execPath, [path.join(ROOT, "scripts", "report.mjs"), "--input", path.join(resultDir, "runs.json")], { stdio: "inherit" });
  process.exitCode = report.status ?? 0;
}

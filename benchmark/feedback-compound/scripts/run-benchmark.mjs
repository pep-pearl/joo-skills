#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, copyTree, ensureDir, parseArgs, readJson, resetDir, writeJson } from "./lib.mjs";
import { scoreAnswer } from "./scoring.mjs";

const args = parseArgs();
const model = String(args.model ?? process.env.BENCHMARK_MODEL ?? "").trim();
if (!model) {
  console.error('BENCHMARK_NOT_RUN: model is required. Example: npm run benchmark -- --runner codex --model "MODEL"');
  process.exit(1);
}
const requestedRunner = String(args.runner ?? process.env.BENCHMARK_RUNNER ?? "auto").toLowerCase();
if (!["auto", "agy", "codex"].includes(requestedRunner)) {
  console.error(`BENCHMARK_NOT_RUN: unsupported runner ${requestedRunner}`);
  process.exit(1);
}
const repeat = Math.max(1, Number(args.repeat ?? 3));
const reasoning = String(args.reasoning ?? process.env.BENCHMARK_REASONING ?? "medium");
const dryRun = Boolean(args["dry-run"]);
const keepWork = Boolean(args["keep-work"]);
const skipCliCheck = Boolean(args["skip-cli-check"]);
const caseFilter = args.case ? new Set(String(args.case).split(",").map((item) => item.trim()).filter(Boolean)) : null;
const maxCases = args["max-cases"] ? Math.max(1, Number(args["max-cases"])) : null;

function fail(message) { console.error(`BENCHMARK_NOT_RUN: ${message}`); process.exit(1); }
function quote(value) { return `"${String(value).replaceAll('"', '""')}"`; }
function spawnProgram(bin, argv, options = {}) {
  const settings = { cwd: options.cwd ?? ROOT, input: options.input, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true, timeout: options.timeout ?? 20 * 60_000 };
  if (process.platform === "win32" && String(bin).toLowerCase().endsWith(".cmd")) {
    return spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", ["call", quote(bin), ...argv.map(quote)].join(" ")], { ...settings, windowsVerbatimArguments: true });
  }
  return spawnSync(bin, argv, settings);
}
function executable(candidate) {
  if (!candidate) return false;
  if ((path.isAbsolute(candidate) || candidate.includes("/") || candidate.includes("\\")) && !fs.existsSync(candidate)) return false;
  const result = spawnProgram(candidate, ["--version"], { timeout: 15_000 });
  return !result.error && result.status === 0;
}
function first(candidates) { return [...new Set(candidates.filter(Boolean))].find(executable) ?? null; }
function agyCandidates() {
  const local = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "agy", "bin", "agy.exe") : null;
  return [args["agy-bin"], process.env.AGY_BIN, local, process.platform === "win32" ? "agy.exe" : "agy", "agy"];
}
function codexCandidates() { return [args["codex-bin"], process.env.CODEX_BIN, process.platform === "win32" ? "codex.cmd" : "codex", "codex"]; }
function listAgyModels(bin) {
  const result = spawnProgram(bin, ["models"], { timeout: 30_000 });
  if (result.error || result.status !== 0) return [];
  return String(result.stdout ?? "").split(/\r?\n/).map((line) => line.replace(/\u001b\[[0-9;]*m/g, "").replace(/^[>*•\-\s]+/, "").trim()).filter(Boolean).filter((line) => !/^available models:?$/i.test(line));
}
function resolveRunner() {
  if (requestedRunner === "agy") return { kind: "agy", bin: first(agyCandidates()) ?? (skipCliCheck ? "agy" : fail("agy not found")) };
  if (requestedRunner === "codex") return { kind: "codex", bin: first(codexCandidates()) ?? (skipCliCheck ? "codex" : fail("codex not found")) };
  const agy = first(agyCandidates());
  if (agy && listAgyModels(agy).some((item) => item.toLowerCase() === model.toLowerCase())) return { kind: "agy", bin: agy };
  const codex = first(codexCandidates());
  if (codex) return { kind: "codex", bin: codex };
  if (skipCliCheck) return { kind: "codex", bin: "codex" };
  fail("no supported native CLI found");
}

const runner = resolveRunner();
if (!skipCliCheck && runner.kind === "agy") {
  const models = listAgyModels(runner.bin);
  const actual = models.find((item) => item.toLowerCase() === model.toLowerCase());
  if (!actual) fail(`requested Antigravity model not available: ${model}`);
  runner.actualModel = actual;
} else runner.actualModel = model;

const selfCheck = spawnSync(process.execPath, [path.join(ROOT, "scripts", "self-check.mjs")], { cwd: ROOT, encoding: "utf8" });
if (selfCheck.status !== 0) {
  process.stderr.write(selfCheck.stdout ?? "");
  process.stderr.write(selfCheck.stderr ?? "");
  fail("self-check failed");
}

const data = readJson(path.join(ROOT, "benchmark", "cases.json"));
let cases = data.cases;
if (caseFilter) cases = cases.filter((item) => caseFilter.has(item.id));
if (maxCases) cases = cases.slice(0, maxCases);
if (!cases.length) fail("no cases selected");

const resultDir = path.join(ROOT, "results", new Date().toISOString().replaceAll(":", "-").replace(".", "-"));
ensureDir(resultDir);
const workRoot = path.join(ROOT, ".work");
ensureDir(workRoot);
const schemaFile = path.join(ROOT, "benchmark", "output-schema.json");
const results = [];

function parseJsonl(text) {
  const events = [];
  for (const line of String(text ?? "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { /* retain raw log */ }
  }
  return events;
}
function sumUsage(events, key) {
  const values = events.filter((event) => event?.type === "turn.completed" && event.usage).map((event) => Number(event.usage[key])).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}
function usage(events) {
  const input = sumUsage(events, "input_tokens");
  const cached = sumUsage(events, "cached_input_tokens");
  const output = sumUsage(events, "output_tokens");
  const reasoningTokens = sumUsage(events, "reasoning_output_tokens");
  return {
    input_tokens: input,
    cached_input_tokens: cached,
    uncached_input_tokens: Number.isFinite(input) && Number.isFinite(cached) ? Math.max(0, input - cached) : null,
    output_tokens: output,
    reasoning_output_tokens: reasoningTokens,
    total_tokens: Number.isFinite(input) && Number.isFinite(output) ? input + output : null
  };
}
function executionMetrics(events) {
  const items = events.filter((event) => event?.type === "item.completed").map((event) => event.item);
  const commands = items.filter((item) => item?.type === "command_execution");
  return {
    commandCount: commands.length,
    toolOutputChars: commands.reduce((sum, item) => sum + String(item.aggregated_output ?? "").length, 0),
    agentMessageCount: items.filter((item) => item?.type === "agent_message").length
  };
}
function walk(root, relative = "") {
  const current = path.join(root, relative);
  const output = [];
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const next = path.join(relative, entry.name);
    if (entry.isDirectory()) output.push(...walk(root, next));
    else output.push(next.replaceAll("\\", "/"));
  }
  return output;
}
function snapshot(workspace, ignore = new Set()) {
  const map = new Map();
  for (const relative of walk(workspace)) {
    if (ignore.has(relative)) continue;
    map.set(relative, crypto.createHash("sha256").update(fs.readFileSync(path.join(workspace, relative))).digest("hex"));
  }
  return map;
}
function changed(before, after) {
  const keys = new Set([...before.keys(), ...after.keys()]);
  return [...keys].filter((key) => before.get(key) !== after.get(key)).sort();
}
function buildPrompt(answerFile = null) {
  const lines = [
    "You are running the joo-skills Verified Feedback Compound benchmark.",
    "Read case.json and the local AGENTS/rules/skill files available in this workspace.",
    "Use only evidence IDs and correction IDs present in case.json.",
    "Do not use the network or inspect parent directories.",
    "Return exactly one JSON object matching answer-schema.json.",
    "Do not quote hidden expected answers; they are not present in the workspace.",
    "Root cause is a hypothesis unless the case contains independent verification.",
    "A lesson created now never applies to the current task and never exceeds advisory authority."
  ];
  if (answerFile) lines.splice(1, 0, `Write the final JSON to ${answerFile}. Modify no other file.`);
  else lines.splice(1, 0, "Do not modify files.");
  return lines.join("\n");
}
function materialize(testCase, variant, workspace) {
  resetDir(workspace);
  copyTree(path.join(ROOT, "variants", variant), workspace);
  writeJson(path.join(workspace, "case.json"), { schemaVersion: 1, id: testCase.id, category: testCase.category, ...testCase.input });
  fs.copyFileSync(schemaFile, path.join(workspace, "answer-schema.json"));
}
function runCodex(workspace, finalFile, logFile) {
  const argv = [
    "exec", "--json", "--ephemeral", "--sandbox", "read-only", "--skip-git-repo-check",
    "--model", model, "-c", `model_reasoning_effort="${reasoning}"`, "--cd", workspace,
    "--output-schema", schemaFile, "--output-last-message", finalFile, "-"
  ];
  if (dryRun) return { dryRun: true, command: [runner.bin, ...argv] };
  const start = Date.now();
  const child = spawnProgram(runner.bin, argv, { input: buildPrompt() });
  const durationMs = Date.now() - start;
  fs.writeFileSync(logFile, child.stdout ?? "");
  if (child.stderr) fs.writeFileSync(`${logFile}.stderr.txt`, child.stderr);
  const events = parseJsonl(child.stdout);
  let answer = null;
  let answerError = null;
  try { answer = JSON.parse(fs.readFileSync(finalFile, "utf8")); } catch (error) { answerError = error.message; }
  return {
    durationMs,
    exitCode: child.status,
    spawnError: child.error?.message ?? null,
    answerError,
    infrastructureValid: child.status === 0 && !child.error && !answerError,
    answer,
    usage: usage(events),
    executionMetrics: executionMetrics(events),
    sideEffectPaths: []
  };
}
function runAgy(workspace, finalFile, logFile) {
  const answerName = ".benchmark-answer.json";
  const answerPath = path.join(workspace, answerName);
  const before = snapshot(workspace, new Set([answerName]));
  const argv = ["--model", model, "-p", buildPrompt(answerName)];
  if (dryRun) return { dryRun: true, command: [runner.bin, "--model", model, "-p", "<prompt>"] };
  const start = Date.now();
  const child = spawnProgram(runner.bin, argv, { cwd: workspace });
  const durationMs = Date.now() - start;
  fs.writeFileSync(logFile, child.stdout ?? "");
  if (child.stderr) fs.writeFileSync(`${logFile}.stderr.txt`, child.stderr);
  let answer = null;
  let answerError = null;
  try { answer = JSON.parse(fs.readFileSync(answerPath, "utf8")); fs.copyFileSync(answerPath, finalFile); } catch (error) { answerError = error.message; }
  const after = snapshot(workspace, new Set([answerName]));
  const sideEffectPaths = changed(before, after);
  return {
    durationMs,
    exitCode: child.status,
    spawnError: child.error?.message ?? null,
    answerError,
    infrastructureValid: child.status === 0 && !child.error && !answerError && sideEffectPaths.length === 0,
    answer,
    usage: null,
    executionMetrics: { commandCount: null, toolOutputChars: String(child.stdout ?? "").length, agentMessageCount: null },
    sideEffectPaths
  };
}

const planned = [];
for (let repetition = 1; repetition <= repeat; repetition += 1) {
  const order = repetition % 2 ? ["baseline", "skilled"] : ["skilled", "baseline"];
  for (const testCase of cases) for (const variant of order) planned.push({ repetition, testCase, variant });
}

for (let index = 0; index < planned.length; index += 1) {
  const { repetition, testCase, variant } = planned[index];
  const id = `${String(repetition).padStart(2, "0")}-${variant}-${testCase.id}`;
  const workspace = path.join(workRoot, id);
  materialize(testCase, variant, workspace);
  const finalFile = path.join(resultDir, `${id}.answer.json`);
  const logFile = path.join(resultDir, runner.kind === "codex" ? `${id}.jsonl` : `${id}.stdout.txt`);
  const execution = runner.kind === "codex" ? runCodex(workspace, finalFile, logFile) : runAgy(workspace, finalFile, logFile);
  const scoring = execution.dryRun ? null : execution.infrastructureValid ? scoreAnswer(testCase, execution.answer) : null;
  const record = {
    id, caseId: testCase.id, category: testCase.category, repetition, variant,
    runner: runner.kind, requestedModel: model, actualModel: runner.actualModel,
    reasoningSetting: runner.kind === "codex" ? reasoning : null,
    dryRun,
    ...execution,
    scoring
  };
  results.push(record);
  writeJson(path.join(resultDir, "runs.partial.json"), {
    status: dryRun ? "DRY_RUN" : "RUNNING",
    runner: runner.kind,
    requestedModel: model,
    actualModel: runner.actualModel,
    reasoningSetting: runner.kind === "codex" ? reasoning : null,
    repeat,
    cases: cases.map((item) => item.id),
    plannedRuns: planned.length,
    results
  });
  console.log(`[${index + 1}/${planned.length}] ${id}: ${dryRun ? "DRY_RUN" : execution.infrastructureValid ? scoring.pass ? "PASS" : "FAIL" : "INFRA_FAIL"}`);
  if (!keepWork) fs.rmSync(workspace, { recursive: true, force: true });
}

const runsFile = path.join(resultDir, "runs.json");
writeJson(runsFile, {
  status: dryRun ? "DRY_RUN" : "COMPLETE",
  runner: runner.kind,
  requestedModel: model,
  actualModel: runner.actualModel,
  reasoningSetting: runner.kind === "codex" ? reasoning : null,
  repeat,
  cases: cases.map((item) => item.id),
  plannedRuns: planned.length,
  results
});

if (!dryRun) {
  const report = spawnSync(process.execPath, [path.join(ROOT, "scripts", "report.mjs"), "--input", runsFile], { stdio: "inherit" });
  process.exitCode = report.status ?? 0;
} else console.log(`DRY_RUN saved: ${resultDir}`);

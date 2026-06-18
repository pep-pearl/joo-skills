#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  ROOT,
  copyTree,
  ensureDir,
  normalizePath,
  parseArgs,
  readJson,
  resetDir,
  writeJson
} from "./lib.mjs";

const args = parseArgs();
const model = String(args.model ?? process.env.BENCHMARK_MODEL ?? "").trim();
if (!model) {
  console.error('BENCHMARK_NOT_RUN: Model is required. Example: npm run benchmark -- --model "YOUR_MODEL"');
  process.exit(1);
}

const requestedRunner = String(args.runner ?? process.env.BENCHMARK_RUNNER ?? "auto").trim().toLowerCase();
if (!["auto", "agy", "codex"].includes(requestedRunner)) {
  console.error(`BENCHMARK_NOT_RUN: Unsupported runner "${requestedRunner}". Use auto, agy, or codex.`);
  process.exit(1);
}

const requestedReasoning = args.reasoning ?? args["reasoning-effort"] ?? process.env.BENCHMARK_REASONING ?? null;
const repeat = Math.max(1, Number(args.repeat ?? 3));
const caseFilter = args.case ? new Set(String(args.case).split(",").map((value) => value.trim()).filter(Boolean)) : null;
const maxCases = args["max-cases"] ? Number(args["max-cases"]) : null;
const dryRun = Boolean(args["dry-run"]);
const keepWork = Boolean(args["keep-work"]);
const skipCliCheck = Boolean(args["skip-cli-check"]);
const baselineTemplate = path.resolve(String(args["baseline-workspace"] ?? path.join(ROOT, "fixture")));
const indexedTemplate = path.resolve(String(args["indexed-workspace"] ?? path.join(ROOT, "variants", "indexed")));
const casesFile = path.resolve(String(args.cases ?? path.join(ROOT, "benchmark", "cases.json")));
const schemaFile = path.resolve(String(args.schema ?? path.join(ROOT, "benchmark", "output-schema.json")));

function fail(message) {
  console.error(`BENCHMARK_NOT_RUN: ${message}`);
  process.exit(1);
}

function requireFile(file, label = file) {
  if (!fs.existsSync(file)) fail(`Missing ${label}: ${file}`);
}

function quoteCmd(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function spawnProgram(bin, programArgs, options = {}) {
  const spawnOptions = {
    cwd: options.cwd ?? ROOT,
    input: options.input,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: options.stdio,
    windowsHide: true,
    timeout: options.timeout
  };

  if (process.platform === "win32" && String(bin).toLowerCase().endsWith(".cmd")) {
    const commandLine = [quoteCmd(bin), ...programArgs.map(quoteCmd)].join(" ");
    return spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", commandLine], spawnOptions);
  }
  return spawnSync(bin, programArgs, spawnOptions);
}

function candidateExists(candidate) {
  if (!candidate) return false;
  if (path.isAbsolute(candidate) || candidate.includes("/") || candidate.includes("\\")) {
    return fs.existsSync(candidate);
  }
  const result = spawnProgram(candidate, ["--version"], { timeout: 15_000 });
  return !result.error && result.status === 0;
}

function firstExecutable(candidates) {
  const seen = new Set();
  for (const candidate of candidates.filter(Boolean)) {
    const normalized = String(candidate);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    if (candidateExists(normalized)) return normalized;
  }
  return null;
}

function agyCandidates() {
  const localAppData = process.env.LOCALAPPDATA;
  const userProfile = process.env.USERPROFILE;
  return [
    args["agy-bin"],
    process.env.AGY_BIN,
    localAppData ? path.join(localAppData, "agy", "bin", "agy.exe") : null,
    userProfile ? path.join(userProfile, "AppData", "Local", "agy", "bin", "agy.exe") : null,
    process.platform === "win32" ? "agy.exe" : "agy",
    "agy"
  ];
}

function codexCandidates() {
  return [
    args["codex-bin"],
    process.env.CODEX_BIN,
    process.platform === "win32" ? "codex.cmd" : "codex",
    "codex"
  ];
}

function listAgyModels(bin) {
  const result = spawnProgram(bin, ["models"], { timeout: 30_000 });
  if (result.error || result.status !== 0) return { ok: false, result, models: [] };
  const models = String(result.stdout ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\u001b\[[0-9;]*m/g, "").trim())
    .map((line) => line.replace(/^[>*•\-\s]+/, "").trim())
    .filter(Boolean)
    .filter((line) => !/^available models:?$/i.test(line));
  return { ok: true, result, models };
}

function exactModelMatch(models, requested) {
  const target = requested.trim().toLocaleLowerCase();
  return models.find((item) => item.toLocaleLowerCase() === target) ?? null;
}

function resolveRunner() {
  if (requestedRunner === "agy") {
    const agyBin = firstExecutable(agyCandidates());
    if (!agyBin && !skipCliCheck) {
      fail("Antigravity CLI was requested but agy was not found. On Windows the runner also checked %LOCALAPPDATA%\\agy\\bin\\agy.exe. Run `npm run benchmark:doctor`.");
    }
    return { kind: "agy", bin: agyBin ?? String(args["agy-bin"] ?? process.env.AGY_BIN ?? "agy") };
  }

  if (requestedRunner === "codex") {
    const codexBin = firstExecutable(codexCandidates());
    if (!codexBin && !skipCliCheck) fail("Codex CLI was requested but codex was not found.");
    return { kind: "codex", bin: codexBin ?? String(args["codex-bin"] ?? process.env.CODEX_BIN ?? "codex") };
  }

  const agyBin = firstExecutable(agyCandidates());
  const codexBin = firstExecutable(codexCandidates());
  if (agyBin) {
    const available = listAgyModels(agyBin);
    if (available.ok && exactModelMatch(available.models, model)) return { kind: "agy", bin: agyBin, availableModels: available.models };
    if (!codexBin) return { kind: "agy", bin: agyBin, availableModels: available.models };
  }
  if (codexBin) return { kind: "codex", bin: codexBin };
  if (skipCliCheck) return { kind: "agy", bin: "agy" };
  fail("No supported benchmark CLI was found. Install agy or codex, or pass --runner with an explicit binary path.");
}

const runner = resolveRunner();
const runnerName = runner.kind === "agy" ? "antigravity-cli" : "codex-cli";
const reasoningSetting = runner.kind === "codex"
  ? String(requestedReasoning ?? "medium").trim()
  : null;

if (runner.kind === "agy" && requestedReasoning !== null && requestedReasoning !== undefined) {
  fail("Antigravity CLI does not accept the benchmark --reasoning option. Choose the exact reasoning variant in the model name returned by `agy models`.");
}

function preflight() {
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (!Number.isFinite(nodeMajor) || nodeMajor < 20) fail(`Node.js 20+ is required; found ${process.version}`);

  requireFile(casesFile, "benchmark cases");
  requireFile(schemaFile, "output schema");
  requireFile(baselineTemplate, "baseline fixture");
  requireFile(indexedTemplate, "indexed overlay");

  const check = spawnSync(process.execPath, [path.join(ROOT, "scripts", "self-check.mjs")], {
    cwd: ROOT,
    encoding: "utf8"
  });
  if (check.status !== 0) {
    process.stderr.write(check.stdout ?? "");
    process.stderr.write(check.stderr ?? "");
    fail("Self-check failed");
  }

  if (skipCliCheck) return;

  const version = spawnProgram(runner.bin, ["--version"], { timeout: 30_000 });
  if (version.error || version.status !== 0) {
    fail(`${runnerName} is unavailable (${version.error?.message ?? version.stderr?.trim() ?? `exit ${version.status}`})`);
  }

  if (runner.kind === "agy") {
    const help = spawnProgram(runner.bin, ["--help"], { timeout: 30_000 });
    const helpText = `${help.stdout ?? ""}\n${help.stderr ?? ""}`;
    if (help.error || help.status !== 0 || !helpText.includes("--model") || !/(^|\s)-p([,\s]|$)|--print/.test(helpText)) {
      fail("The installed Antigravity CLI is too old for automated model selection. Run `agy update` or reinstall it.");
    }

    const available = runner.availableModels ? { ok: true, models: runner.availableModels } : listAgyModels(runner.bin);
    if (!available.ok) fail("`agy models` failed. Update Antigravity CLI and complete `agy` sign-in first.");
    const matched = exactModelMatch(available.models, model);
    if (!matched) {
      fail(`Requested model is not available in Antigravity CLI: ${model}. Run \`agy models\` and use one exact model name.`);
    }
    runner.actualModel = matched;
    runner.helpText = helpText;
  } else {
    const help = spawnProgram(runner.bin, ["exec", "--help"], { timeout: 30_000 });
    if (help.error || help.status !== 0) fail("Codex CLI does not support the required exec command");
    runner.actualModel = model;
  }
}

preflight();

let cases = readJson(casesFile).cases;
if (caseFilter) cases = cases.filter((item) => caseFilter.has(item.id));
if (Number.isFinite(maxCases)) cases = cases.slice(0, maxCases);
if (!cases.length) fail("No benchmark cases selected");

const runStamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const resultDir = path.join(ROOT, "results", runStamp);
const workRoot = path.join(os.tmpdir(), "joo-token-navigation-benchmark", runStamp);
ensureDir(resultDir);
ensureDir(workRoot);

function materialize(variant, target) {
  resetDir(target);
  copyTree(baselineTemplate, target);
  if (variant === "indexed") copyTree(indexedTemplate, target);
}

function validateMaterializedWorkspace(variant, workspace) {
  const aiIndex = path.join(workspace, "AI_INDEX.md");
  const agents = path.join(workspace, "AGENTS.md");
  const maps = path.join(workspace, ".ai", "indexing", "maps");
  if (variant === "baseline") {
    const leaked = [aiIndex, agents, maps].filter(fs.existsSync);
    if (leaked.length) throw new Error(`Baseline contains indexed metadata: ${leaked.join(", ")}`);
  } else {
    const missing = [aiIndex, agents, maps].filter((file) => !fs.existsSync(file));
    if (missing.length) throw new Error(`Indexed workspace is incomplete: ${missing.join(", ")}`);
  }
}

function buildPrompt(testCase, answerFileName = null) {
  const lines = [
    "You are running a repository navigation benchmark.",
    "Do not use the network. Do not inspect parent directories or benchmark answer data.",
    "Find the smallest useful set of 1-4 current production source files that are the best entry points for the task.",
    "Return repository-relative file paths only. Do not return directories.",
    "Prefer active app code over legacy, archive, examples, playground, Storybook, generated clients, or tests unless explicitly requested.",
    'The answer object must have exactly this shape: {"entryFiles":["relative/path"],"explanation":"brief reason"}.',
    `Task: ${testCase.prompt}`
  ];

  if (answerFileName) {
    lines.splice(1, 0,
      `Write the final JSON answer to ${answerFileName}.`,
      `You may create or overwrite only ${answerFileName}; do not modify any other file.`,
      "Do not merely describe the JSON. Ensure the file exists before finishing."
    );
  } else {
    lines.splice(1, 0, "Do not modify files.");
  }
  return lines.join("\n");
}

function parseJsonl(stdout) {
  const events = [];
  for (const line of String(stdout ?? "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { /* raw log is retained separately */ }
  }
  return events;
}

function sumKnown(events, key) {
  const values = events
    .map((event) => event.usage?.[key])
    .filter((value) => value !== undefined && value !== null)
    .map(Number)
    .filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function extractUsage(events) {
  const completed = events.filter((event) => event?.type === "turn.completed" && event.usage);
  if (!completed.length) return null;
  const input = sumKnown(completed, "input_tokens");
  const cached = sumKnown(completed, "cached_input_tokens");
  const output = sumKnown(completed, "output_tokens");
  const reasoning = sumKnown(completed, "reasoning_output_tokens");
  return {
    input_tokens: input,
    cached_input_tokens: cached,
    uncached_input_tokens: Number.isFinite(input) && Number.isFinite(cached) ? Math.max(0, input - cached) : null,
    output_tokens: output,
    reasoning_output_tokens: reasoning,
    total_tokens: Number.isFinite(input) && Number.isFinite(output) ? input + output : null
  };
}

function extractExecutionMetrics(events) {
  const completedItems = events.filter((event) => event?.type === "item.completed").map((event) => event.item);
  const commands = completedItems.filter((item) => item?.type === "command_execution");
  return {
    commandCount: commands.length,
    failedCommandCount: commands.filter((item) => Number(item.exit_code) !== 0).length,
    toolOutputChars: commands.reduce((sum, item) => sum + String(item.aggregated_output ?? "").length, 0),
    agentMessageCount: completedItems.filter((item) => item?.type === "agent_message").length
  };
}

function score(testCase, answer, workspace, policyValid = true) {
  const returned = (answer?.entryFiles ?? []).map(normalizePath);
  const uniqueReturned = [...new Set(returned)];
  const groups = testCase.expectedGroups ?? [];
  const expectedSet = new Set(groups.flat().map(normalizePath));
  const groupHits = groups.map((group) => group.some((file) => uniqueReturned.includes(normalizePath(file))));
  const forbidden = (testCase.forbiddenPrefixes ?? []).map(normalizePath);
  const forbiddenHits = uniqueReturned.filter((file) => forbidden.some((prefix) => file === prefix || file.startsWith(`${prefix}/`)));
  const invalidPaths = uniqueReturned.filter((file) => {
    if (!file || file === "." || path.isAbsolute(file) || file.startsWith("../") || file.includes("/../")) return true;
    const absolute = path.join(workspace, file);
    return !fs.existsSync(absolute) || !fs.statSync(absolute).isFile();
  });
  const duplicateCount = returned.length - uniqueReturned.length;
  const hitCount = groupHits.filter(Boolean).length;
  const recall = groups.length ? hitCount / groups.length : 1;
  const precision = uniqueReturned.length ? uniqueReturned.filter((file) => expectedSet.has(file)).length / uniqueReturned.length : 0;
  const rawScore = Math.round((recall * 0.8 + precision * 0.2) * 100);
  const structurallyValid = returned.length >= 1 && returned.length <= 4 && duplicateCount === 0 && invalidPaths.length === 0;
  const pass = policyValid && structurallyValid && hitCount === groups.length && forbiddenHits.length === 0;
  return {
    returned: uniqueReturned,
    groupHits,
    forbiddenHits,
    invalidPaths,
    duplicateCount,
    recall,
    precision,
    score: forbiddenHits.length || invalidPaths.length || !policyValid ? 0 : rawScore,
    structurallyValid,
    policyValid,
    pass
  };
}

function walkFiles(root, relative = "") {
  const current = path.join(root, relative);
  const entries = fs.readdirSync(current, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const childRelative = path.join(relative, entry.name);
    if (entry.isDirectory()) output.push(...walkFiles(root, childRelative));
    else if (entry.isFile()) output.push(childRelative);
  }
  return output;
}

function snapshotWorkspace(workspace, ignored = new Set()) {
  const snapshot = new Map();
  for (const relative of walkFiles(workspace)) {
    const normalized = normalizePath(relative);
    if (ignored.has(normalized)) continue;
    const content = fs.readFileSync(path.join(workspace, relative));
    snapshot.set(normalized, crypto.createHash("sha256").update(content).digest("hex"));
  }
  return snapshot;
}

function changedPaths(before, after) {
  const all = new Set([...before.keys(), ...after.keys()]);
  return [...all].filter((key) => before.get(key) !== after.get(key)).sort();
}

function parseAnswerText(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return null;
  const candidates = [raw];
  const fenced = [...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((match) => match[1].trim());
  candidates.push(...fenced.reverse());
  const objectMatches = [...raw.matchAll(/\{[\s\S]*?"entryFiles"[\s\S]*?\}/g)].map((match) => match[0]);
  candidates.push(...objectMatches.reverse());
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && Array.isArray(parsed.entryFiles)) return parsed;
    } catch { /* try next representation */ }
  }
  return null;
}

function runCodex(variant, testCase, repetition, id, workspace, finalFile, logFile) {
  const prompt = buildPrompt(testCase);
  const codexArgs = [
    "exec", "--json", "--ephemeral", "--sandbox", "read-only", "--skip-git-repo-check",
    "--model", model,
    "-c", `model_reasoning_effort="${reasoningSetting}"`,
    "--cd", workspace,
    "--output-schema", schemaFile,
    "--output-last-message", finalFile,
    "-"
  ];

  if (dryRun) return { command: [runner.bin, ...codexArgs], promptTransport: "stdin" };

  const startedAt = Date.now();
  const child = spawnProgram(runner.bin, codexArgs, { input: prompt, timeout: 20 * 60_000 });
  const durationMs = Date.now() - startedAt;
  fs.writeFileSync(logFile, child.stdout ?? "", "utf8");
  if (child.stderr) fs.writeFileSync(path.join(resultDir, `${id}.stderr.txt`), child.stderr, "utf8");

  const events = parseJsonl(child.stdout);
  let answer = null;
  let answerError = null;
  try { answer = JSON.parse(fs.readFileSync(finalFile, "utf8")); } catch (error) { answerError = error.message; }
  const eventCounts = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] ?? 0) + 1;
    return acc;
  }, {});
  const infrastructureValid = child.status === 0 && !child.error && !answerError && Boolean(eventCounts["turn.completed"]);

  return {
    requestedModel: model,
    actualModel: runner.actualModel ?? model,
    reasoningSetting,
    durationMs,
    exitCode: child.status,
    signal: child.signal,
    spawnError: child.error?.message ?? null,
    answerError,
    infrastructureValid,
    executionValid: infrastructureValid,
    usage: extractUsage(events),
    executionMetrics: extractExecutionMetrics(events),
    answer,
    eventCounts,
    sideEffectPaths: []
  };
}

function runAgy(variant, testCase, repetition, id, workspace, finalFile, logFile) {
  const answerFileName = ".benchmark-answer.json";
  const workspaceAnswer = path.join(workspace, answerFileName);
  const ignored = new Set([answerFileName]);
  const before = snapshotWorkspace(workspace, ignored);
  const prompt = buildPrompt(testCase, answerFileName);
  const agyArgs = ["--model", model];
  if (runner.helpText?.includes("--print-timeout")) agyArgs.push("--print-timeout", "20m");
  agyArgs.push("-p", prompt);

  if (dryRun) return { command: [runner.bin, "--model", model, "-p", "<benchmark prompt>"], promptTransport: "argument" };

  const startedAt = Date.now();
  const child = spawnProgram(runner.bin, agyArgs, { cwd: workspace, timeout: 20 * 60_000 });
  const durationMs = Date.now() - startedAt;
  fs.writeFileSync(logFile, child.stdout ?? "", "utf8");
  if (child.stderr) fs.writeFileSync(path.join(resultDir, `${id}.stderr.txt`), child.stderr, "utf8");

  let answer = null;
  let answerError = null;
  if (fs.existsSync(workspaceAnswer)) {
    try {
      answer = JSON.parse(fs.readFileSync(workspaceAnswer, "utf8"));
      fs.copyFileSync(workspaceAnswer, finalFile);
    } catch (error) {
      answerError = error.message;
    }
  } else {
    answer = parseAnswerText(child.stdout);
    if (answer) writeJson(finalFile, answer);
    else answerError = `${answerFileName} was not created and stdout did not contain a valid answer object`;
  }

  const after = snapshotWorkspace(workspace, ignored);
  const sideEffectPaths = changedPaths(before, after);
  const infrastructureValid = child.status === 0 && !child.error && !answerError;

  return {
    requestedModel: model,
    actualModel: runner.actualModel ?? model,
    reasoningSetting: null,
    durationMs,
    exitCode: child.status,
    signal: child.signal,
    spawnError: child.error?.message ?? null,
    answerError,
    infrastructureValid,
    executionValid: infrastructureValid,
    usage: null,
    executionMetrics: null,
    answer,
    eventCounts: null,
    sideEffectPaths
  };
}

function runOne(variant, testCase, repetition) {
  const id = `${String(repetition).padStart(2, "0")}-${variant}-${testCase.id}`;
  const workspace = path.join(workRoot, id);
  materialize(variant, workspace);
  validateMaterializedWorkspace(variant, workspace);

  const finalFile = path.join(resultDir, `${id}.answer.json`);
  const logFile = path.join(resultDir, runner.kind === "agy" ? `${id}.stdout.txt` : `${id}.jsonl`);

  console.log(`[${runner.kind}/${variant}] ${testCase.id} (repeat ${repetition}/${repeat})`);
  const run = runner.kind === "agy"
    ? runAgy(variant, testCase, repetition, id, workspace, finalFile, logFile)
    : runCodex(variant, testCase, repetition, id, workspace, finalFile, logFile);

  if (dryRun) {
    if (!keepWork) fs.rmSync(workspace, { recursive: true, force: true });
    return { id, variant, caseId: testCase.id, repetition, dryRun: true, runner: runnerName, ...run };
  }

  const policyValid = (run.sideEffectPaths ?? []).length === 0;
  const scoring = score(testCase, run.answer, workspace, policyValid);
  if (!keepWork) fs.rmSync(workspace, { recursive: true, force: true });
  return {
    id,
    variant,
    caseId: testCase.id,
    repetition,
    runner: runnerName,
    ...run,
    scoring
  };
}

function writeProgress(results, status = "RUNNING") {
  writeJson(path.join(resultDir, "runs.partial.json"), {
    createdAt: new Date().toISOString(),
    status,
    runner: runnerName,
    runnerBinary: runner.bin,
    requestedModel: model,
    actualModel: runner.actualModel ?? null,
    reasoningSetting,
    repeat,
    cases: cases.map((item) => item.id),
    results
  });
}

function finish(results, status) {
  const output = {
    createdAt: new Date().toISOString(),
    status,
    runner: runnerName,
    runnerBinary: runner.bin,
    requestedModel: model,
    actualModel: runner.actualModel ?? null,
    reasoningSetting,
    repeat,
    plannedRuns: repeat * cases.length * 2,
    cases: cases.map((item) => item.id),
    casesFile,
    results
  };
  writeJson(path.join(resultDir, "runs.json"), output);
  const report = spawnSync(process.execPath, [path.join(ROOT, "scripts", "report.mjs"), "--input", path.join(resultDir, "runs.json")], {
    stdio: "inherit"
  });
  if (!keepWork) fs.rmSync(workRoot, { recursive: true, force: true });
  process.exit(report.status ?? (status === "COMPLETED" ? 0 : 1));
}

const results = [];
for (let repetition = 1; repetition <= repeat; repetition += 1) {
  const order = repetition % 2 === 1 ? ["baseline", "indexed"] : ["indexed", "baseline"];
  for (let caseIndex = 0; caseIndex < cases.length; caseIndex += 1) {
    const testCase = cases[caseIndex];
    const pair = [];
    for (const variant of order) {
      const result = runOne(variant, testCase, repetition);
      results.push(result);
      pair.push(result);
      writeProgress(results);
    }

    if (!dryRun && repetition === 1 && caseIndex === 0 && pair.some((run) => !run.infrastructureValid)) {
      console.error("The first baseline/indexed pair failed infrastructure validation. Remaining runs were not started.");
      finish(results, "FAILED_PREFLIGHT_PAIR");
    }
  }
}

finish(results, dryRun ? "DRY_RUN" : "COMPLETED");

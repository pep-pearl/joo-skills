#!/usr/bin/env node

/**
 * Lightweight repo indexing scanner.
 *
 * No external dependencies.
 * Produces candidate files for AI review:
 * - AI_INDEX.candidate.md
 * - file-map.candidate.json
 * - file-hints.candidate.md
 * - source-header-exceptions.md (only when --source-headers is used)
 * - indexing-report.json
 * - manifest.json
 * - maps/root.md
 * - maps/routes.md
 * - maps/behavior.md
 * - maps/api.md
 * - maps/state.md
 * - maps/packages.md
 * - maps/domains/*.md
 *
 * This script does not modify source files. Source-level @ai-* headers are disabled by default.
 * Safe defaults: respects .gitignore/.aiignore and excludes sensitive-looking paths unless explicitly opted out.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { assessRepositoryFiles, resolveIndexingDecision } from "./lib/joo-indexing-assessment.mjs";
import {
  buildUsageIndex,
  chooseShards,
  createPriorityState,
  loadPriorityState,
  previousEntriesForShard,
  readUsageEvents,
  resolveBudgetPolicy,
  scoreIndexEntry,
  selectEntriesWithinBudget
} from "./lib/joo-indexing-budget.mjs";

const args = process.argv.slice(2);

function getArg(name, fallback) {
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return fallback;
}

function getArgs(name) {
  const values = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === name && args[i + 1]) values.push(args[i + 1]);
  }
  return values;
}

function hasFlag(name) {
  return args.includes(name);
}

const target = path.resolve(getArg("--target", "."));
const outDir = path.resolve(getArg("--out", path.join(target, ".ai", "indexing")));
const emitMapsRequested = !hasFlag("--no-maps");
const indexingMode = String(getArg("--mode", getArg("--indexing-mode", "auto"))).trim().toLowerCase();
const requestedLevel = getArg("--level", null);
const requestedProfile = String(getArg("--profile", "auto")).trim().toLowerCase();
const budgetConfigPath = getArg("--budget-config", null);
// Safe-by-default scanning. Positive flags are kept as backward-compatible no-ops.
// Use explicit opt-out flags only for trusted local repos where broader indexing is intentional.
const respectGitignore = !hasFlag("--no-respect-gitignore");
const denySensitivePaths = !hasFlag("--allow-sensitive-paths");
const includeGenerated = hasFlag("--include-generated");
const candidateOnly = hasFlag("--candidate-only");
const allowSourceHeaders = hasFlag("--source-headers");
const respectAiIgnore = !hasFlag("--no-respect-ai-ignore");
let maxFilesPerMap = Number(getArg("--max-files-per-map", "80"));
let maxMapTokens = Number(getArg("--max-map-tokens", "1600"));
let maxDomainMaps = Number(getArg("--max-domain-maps", "16"));
const maxTotalFiles = Number(getArg("--max-total-files", "0"));
const maxDepth = Number(getArg("--max-depth", "0"));
const changedSince = getArg("--changed-since", null);
const excludePatterns = getArgs("--exclude")
  .flatMap((value) => value.split(","))
  .map((value) => value.trim())
  .filter(Boolean);

const scanWarnings = [];

if (hasFlag("--no-respect-gitignore")) {
  scanWarnings.push(".gitignore rules are ignored because --no-respect-gitignore was used.");
}
if (hasFlag("--no-respect-ai-ignore")) {
  scanWarnings.push(".aiignore/.ignore/.repomixignore rules are ignored because --no-respect-ai-ignore was used.");
}
if (hasFlag("--allow-sensitive-paths")) {
  scanWarnings.push("Sensitive-looking paths are allowed because --allow-sensitive-paths was used. Do not share outputs with external AI tools before review.");
}
if (hasFlag("--respect-gitignore") || hasFlag("--respect-ai-ignore") || hasFlag("--deny-sensitive-paths")) {
  scanWarnings.push("Safe scan flags are enabled by default; --respect-gitignore, --respect-ai-ignore, and --deny-sensitive-paths are kept for backward compatibility.");
}

const IGNORE_DIRS = new Set([
  ".git",
  ".ai",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".turbo",
  "coverage",
  ".cache",
  ".vercel",
  ".idea",
  ".vscode",
  "storybook-static",
]);

const IGNORE_FILE_PATTERNS = [
  /(^|\/)package-lock\.json$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)bun\.lockb$/,
  /(^|\/)\.DS_Store$/,
  /\.snap$/,
  /\.map$/,
  /\.(png|jpg|jpeg|gif|webp|svg|ico|pdf|zip|gz|tar|woff2?|ttf|eot)$/i,
];

const GENERATED_PATH_PATTERNS = [
  /(^|\/)__generated__(\/|$)/i,
  /(^|\/)generated(\/|$)/i,
  /(^|\/)gen(\/|$)/i,
  /(^|\/)graphql(\/|$).*\.generated\./i,
  /\.generated\./i,
  /\.gen\./i,
  /openapi.*(generated|schema|client)/i,
  /swagger.*(generated|schema|client)/i,
];

const SENSITIVE_PATH_PATTERNS = [
  /(^|\/)\.env(\.|$)/i,
  /(^|\/)(secret|secrets)(\/|\.|$)/i,
  /(^|\/)(credential|credentials)(\/|\.|$)/i,
  /(^|\/)(private|internal-only)(\/|\.|$)/i,
  /(^|\/)(api[_-]?key|access[_-]?token|auth[_-]?token|password|passwd)(\.|\/|$)/i,
];

const IMPORTANT_FILE_PATTERNS = [
  /(^|\/)package\.json$/,
  /(^|\/)pnpm-workspace\.yaml$/,
  /(^|\/)turbo\.json$/,
  /(^|\/)nx\.json$/,
  /(^|\/)vite\.config\./,
  /(^|\/)next\.config\./,
  /(^|\/)tsconfig\.json$/,
  /(^|\/)AGENTS\.md$/,
  /(^|\/)CLAUDE\.md$/,
  /(^|\/)AI_INDEX\.md$/,
];

const ENTRY_CANDIDATE_PATTERNS = [
  /(^|\/)main\.(tsx|ts|jsx|js)$/,
  /(^|\/)App\.(tsx|ts|jsx|js)$/,
  /(^|\/)appRoutes\.(tsx|ts|jsx|js)$/,
  /(^|\/)routes\.(tsx|ts|jsx|js)$/,
  /(^|\/)router\.(tsx|ts|jsx|js)$/,
  /(^|\/)route-provider\.(tsx|ts|jsx|js)$/,
  /(^|\/)provider(s)?\.(tsx|ts|jsx|js)$/,
  /(^|\/)store\.(ts|tsx|js|jsx)$/,
  /(^|\/).*store\.(ts|tsx|js|jsx)$/,
  /(^|\/)client\.(ts|tsx|js|jsx)$/,
  /(^|\/)api\.(ts|tsx|js|jsx)$/,
  /(^|\/)query.*\.(ts|tsx|js|jsx)$/,
];

const HEADER_CANDIDATE_PATTERNS = [
  /(^|\/)main\.(tsx|ts|jsx|js)$/,
  /(^|\/).*routes?\.(tsx|ts|jsx|js)$/,
  /(^|\/).*provider.*\.(tsx|ts|jsx|js)$/,
  /(^|\/)(store|state|session|cache)\.(tsx|ts|jsx|js)$/i,
  /(^|\/)[^/]*(Store|State|Session|Cache)\.(tsx|ts|jsx|js)$/,
  /(^|\/).*api.*\.(tsx|ts|jsx|js)$/,
  /(^|\/).*client.*\.(tsx|ts|jsx|js)$/,
  /(^|\/)pages\/[^/]+\/(index|ui|page)\.(tsx|ts|jsx|js)$/,
  /(^|\/)app\/.*\.(tsx|ts|jsx|js)$/,
];

function globToRegex(pattern) {
  const normalized = pattern.replaceAll(path.sep, "/");
  const escaped = normalized.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regex = escaped.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
  if (normalized.endsWith("/")) return new RegExp(`(^|/)${regex}`);
  if (normalized.startsWith("/")) return new RegExp(`^${regex.slice(1)}($|/|$)`);
  if (!normalized.includes("/")) return new RegExp(`(^|/)${regex}($|/)`);
  return new RegExp(`(^|/)${regex}($|/)`);
}

function loadIgnoreRulesFrom(fileName, label) {
  const file = path.join(target, fileName);
  if (!fs.existsSync(file)) return [];
  const rules = fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("!"))
    .map(globToRegex);
  if (rules.length) scanWarnings.push(`Loaded ${rules.length} basic ${label} rules. Negation rules are not supported.`);
  return rules;
}

const gitignoreRules = respectGitignore ? loadIgnoreRulesFrom(".gitignore", ".gitignore") : [];
const aiIgnoreRules = respectAiIgnore
  ? [".aiignore", ".ignore", ".repomixignore"].flatMap((fileName) => loadIgnoreRulesFrom(fileName, fileName))
  : [];
const cliExcludeRules = excludePatterns.map(globToRegex);

function isIgnoredByRules(rel, rules) {
  return rules.some((rule) => rule.test(rel));
}

function isGeneratedPath(file) {
  return GENERATED_PATH_PATTERNS.some((p) => p.test(file));
}

function isSensitivePath(file) {
  return SENSITIVE_PATH_PATTERNS.some((p) => p.test(file));
}

function isTooDeep(rel) {
  if (!maxDepth) return false;
  return rel.split("/").filter(Boolean).length > maxDepth;
}

function walk(dir, acc = []) {
  if (maxTotalFiles && acc.length >= maxTotalFiles) return acc;

  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }

  for (const entry of entries) {
    if (maxTotalFiles && acc.length >= maxTotalFiles) break;

    const abs = path.join(dir, entry.name);
    const rel = path.relative(target, abs).replaceAll(path.sep, "/");

    if (abs === outDir || abs.startsWith(`${outDir}${path.sep}`)) continue;
    if (IGNORE_DIRS.has(entry.name)) continue;
    if (isIgnoredByRules(rel, gitignoreRules) || isIgnoredByRules(rel, aiIgnoreRules) || isIgnoredByRules(rel, cliExcludeRules)) continue;
    if (isTooDeep(rel)) continue;
    if (denySensitivePaths && isSensitivePath(rel)) {
      scanWarnings.push(`Sensitive-looking path excluded: ${rel}`);
      continue;
    }

    if (entry.isDirectory()) {
      walk(abs, acc);
      continue;
    }

    if (IGNORE_FILE_PATTERNS.some((p) => p.test(rel))) continue;
    acc.push(rel);
  }

  return acc;
}

function exists(rel) {
  return fs.existsSync(path.join(target, rel));
}

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(target, rel), "utf8"));
  } catch {
    return null;
  }
}

function matchAny(file, patterns) {
  return patterns.some((p) => p.test(file));
}


function estimateTokens(value) {
  return Math.ceil(String(value ?? "").length / 4);
}

function truncateByTokenBudget(lines, tokenBudget) {
  if (!tokenBudget) return { lines, truncated: 0, estimatedTokens: estimateTokens(lines.join("\n")) };
  const kept = [];
  let used = 0;
  for (const line of lines) {
    const next = estimateTokens(`${line}\n`);
    if (kept.length && used + next > tokenBudget) break;
    kept.push(line);
    used += next;
  }
  return {
    lines: kept,
    truncated: Math.max(0, lines.length - kept.length),
    estimatedTokens: used,
  };
}

function hasStateSignal(file) {
  const expanded = String(file).replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  return /(^|[\/_.-])(store|state|session|cache|atom|redux|zustand|jotai|recoil|url-state)([\/_.-]|$)/.test(expanded);
}

function pathTerms(file, kind = "file") {
  const pieces = new Set([kind]);
  const expanded = file.replace(/([a-z0-9])([A-Z])/g, "$1-$2");
  for (const part of expanded.split(/[\/_.-]+/)) {
    const cleaned = part.trim().toLowerCase();
    if (cleaned && cleaned.length >= 2 && !/^(src|app|index|tsx|jsx|ts|js|md|json)$/.test(cleaned)) pieces.add(cleaned);
  }
  return [...pieces];
}

function keywordsFor(file, kind = "file") {
  const pieces = new Set(pathTerms(file, kind));
  if (/query|mutation/i.test(file)) pieces.add("query");
  if (/routes?|router/i.test(file)) pieces.add("route");
  if (hasStateSignal(file)) pieces.add("state");
  if (/badge|label|formatter|format|mapper|button|field|toggle|card/i.test(file)) pieces.add("behavior");
  return [...pieces].slice(0, 3);
}

function anchorsFor(file, kind = "file") {
  return pathTerms(path.basename(file), kind)
    .filter((item) => !["file", "domain", "candidate", "tsx", "ts", "jsx", "js"].includes(item))
    .slice(0, 8);
}

function roleFor(file, kind = "file") {
  const base = path.basename(file);
  if (/routes?|router|appRoutes/i.test(base)) return "route-entry";
  if (/(page|screen|view|layout)\.(tsx|ts|jsx|js)$/i.test(base)) return "surface-entry";
  if (/query|mutation/i.test(file)) return "data-boundary";
  if (/api|client|openapi|swagger|endpoint/i.test(file)) return "data-boundary";
  if (hasStateSignal(file)) return "state-boundary";
  if (/badge|label|formatter|format|mapper|button|field|toggle|card/i.test(base)) return "behavior-candidate";
  if (/provider/i.test(file)) return "provider";
  if (/package\.json|workspace|turbo|nx|vite|next\.config|tsconfig/i.test(file)) return "package-or-config";
  if (/main\.(tsx|ts|jsx|js)$|App\.(tsx|ts|jsx|js)$/i.test(file)) return "app-bootstrap";
  return kind === "file" ? "domain-candidate" : kind;
}

function concernFor(file, role = roleFor(file)) {
  if (/behavior/.test(role)) return "behavior";
  if (/surface/.test(role)) return "surface";
  if (/route/.test(role)) return "route";
  if (/state/.test(role)) return "state";
  if (/data|api|query|mutation/.test(role)) return "data";
  if (/package|config|workspace|build/.test(role)) return "config";
  return "domain";
}

function toFileHint(file, kind = "file") {
  const role = roleFor(file, kind);
  return {
    path: file,
    role,
    concern: concernFor(file, role),
    scope: describeFile(file, kind),
    domain: extractDomain(file),
    anchors: anchorsFor(file, kind),
    keywords: keywordsFor(file, kind),
    related: [],
    confidence: confidenceFor(file),
    lastVerified: null,
    source: "path-heuristic",
  };
}

function asList(items, limit = maxFilesPerMap) {
  const shown = items.slice(0, limit);
  const lines = shown.map((f) => `- \`${f}\``);
  if (items.length > limit) lines.push(`- ... truncated ${items.length - limit} more; use targeted search`);
  return lines.join("\n") || "- none detected";
}

function confidenceFor(file) {
  if (isGeneratedPath(file)) return "low generated";
  if (/AGENTS\.md|AI_INDEX\.md|package\.json|routes?|router|main\.|App\./i.test(file)) return "medium path-heuristic";
  return "low path-heuristic";
}

function formatHintLine(file, kind = "file") {
  const hint = toFileHint(file, kind);
  const domain = hint.domain ? `; domain: ${hint.domain}` : "";
  const anchors = hint.anchors.length ? `; anchors: ${hint.anchors.join(", ")}` : "";
  const keywords = hint.keywords.length ? `; keywords: ${hint.keywords.join(", ")}` : "";
  return `- \`${file}\`; role: ${hint.role}; concern: ${hint.concern}; scope: ${hint.scope}${domain}${anchors}${keywords}; confidence: ${hint.confidence}`;
}

function asFileMap(items, kind, limit = maxFilesPerMap, tokenBudget = maxMapTokens) {
  const rawLines = items.slice(0, limit).map((f) => formatHintLine(f, kind));
  const packed = truncateByTokenBudget(rawLines, tokenBudget);
  const lines = packed.lines;
  const remaining = Math.max(0, items.length - lines.length);
  if (remaining) lines.push(`- ... truncated ${remaining} more; estimated_tokens: ${packed.estimatedTokens}; use targeted search or exact path lookup`);
  return lines.join("\n") || "- none detected";
}

function describeFile(file, kind = "file") {
  const base = path.basename(file);
  if (/routes?|router|appRoutes/i.test(base)) return "routing entry or route map";
  if (/(page|screen|view|layout)\.(tsx|ts|jsx|js)$/i.test(base)) return "page or screen surface";
  if (/api|client|openapi|swagger|query|mutation/i.test(file)) return "data/API boundary candidate";
  if (hasStateSignal(file)) return "state/cache/session boundary candidate";
  if (/badge|label|formatter|format|mapper|button|field|toggle|card/i.test(base)) return "concrete UI behavior candidate";
  if (/package\.json|workspace|turbo|nx|vite|next\.config|tsconfig/i.test(file)) return "package/build/config candidate";
  if (/provider/i.test(file)) return "provider/bootstrap candidate";
  if (/main\.(tsx|ts|jsx|js)$|App\.(tsx|ts|jsx|js)$/i.test(file)) return "app bootstrap candidate";
  return `${kind} candidate`;
}

function extractDomain(file) {
  const parts = file.split("/");
  const markers = ["pages", "features", "entities", "domains", "modules"];
  for (const marker of markers) {
    const i = parts.indexOf(marker);
    if (i >= 0 && parts[i + 1]) return cleanDomain(parts[i + 1]);
  }

  const srcIndex = parts.indexOf("src");
  if (srcIndex >= 0 && parts[srcIndex + 1] && !["app", "shared", "common", "components", "ui", "lib"].includes(parts[srcIndex + 1])) {
    return cleanDomain(parts[srcIndex + 1]);
  }

  return null;
}

function cleanDomain(value) {
  return value
    .replace(/\.(tsx|ts|jsx|js|json|md)$/i, "")
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
}

function writeFile(rel, content) {
  const abs = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content.trimEnd() + "\n", "utf8");
}

function cleanupManagedArtifacts() {
  const files = [
    "AI_INDEX.candidate.md",
    "assessment-report.json",
    "indexing-report.json",
    "file-map.candidate.json",
    "file-hints.candidate.md",
    "source-header-exceptions.md",
    "manifest.json",
    "priority-report.json"
  ];
  for (const rel of files) fs.rmSync(path.join(outDir, rel), { force: true });
  fs.rmSync(path.join(outDir, "maps"), { recursive: true, force: true });
}

function getChangedFiles() {
  if (!changedSince) return null;
  try {
    const output = execFileSync("git", ["-C", target, "diff", "--name-only", "--diff-filter=ACMR", changedSince], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const changed = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((rel) => exists(rel));
    scanWarnings.push(`Changed-since mode: ${changed.length} changed files from ${changedSince}.`);
    return changed;
  } catch (error) {
    scanWarnings.push(`Could not read git changed files from ${changedSince}; falling back to full candidate set.`);
    return null;
  }
}

const allFiles = walk(target).sort();

const assessmentStatePath = path.join(outDir, "assessment-state.json");
let previousAssessmentLevel = null;
try {
  const previousState = JSON.parse(fs.readFileSync(assessmentStatePath, "utf8"));
  if (Number.isInteger(Number(previousState.actualLevel))) previousAssessmentLevel = Number(previousState.actualLevel);
} catch { /* first assessment or unreadable state */ }

const assessment = assessRepositoryFiles({
  target,
  files: allFiles,
  previousLevel: previousAssessmentLevel
});
const indexingDecision = resolveIndexingDecision({
  mode: indexingMode,
  requestedLevel,
  recommendedLevel: assessment.recommendedLevel,
  score: assessment.score,
  previousLevel: previousAssessmentLevel
});
const actualIndexingLevel = indexingDecision.actualLevel;
const usageEvents = readUsageEvents(target);
const budgetPolicy = resolveBudgetPolicy({
  target,
  level: actualIndexingLevel,
  assessment,
  requestedProfile,
  configPath: budgetConfigPath,
  usageEvents
});
if (budgetPolicy.warning) scanWarnings.push(budgetPolicy.warning);
if (budgetPolicy.roi.status === "poor" && budgetPolicy.policy.autoShrinkOnPoorRoi) {
  scanWarnings.push("Measured indexing ROI is poor; the budget profile was tightened to avoid further expansion.");
}
const effectiveBudgetBytes = budgetPolicy.limits.totalBytes;
const emitMaps = emitMapsRequested && actualIndexingLevel >= 2 && !candidateOnly;
const emitFileMapAllowed = actualIndexingLevel >= 3 && budgetPolicy.limits.poolBytes.fileMap >= 1_000;
const emitDetailedHints = actualIndexingLevel >= 3 && hasFlag("--detailed-hints");

maxFilesPerMap = Math.min(maxFilesPerMap, budgetPolicy.limits.maxEntriesPerShard);
maxMapTokens = Math.min(maxMapTokens, budgetPolicy.limits.maxMapTokens);
maxDomainMaps = Math.min(maxDomainMaps, budgetPolicy.limits.maxDomainShards);
if (actualIndexingLevel <= 1) maxDomainMaps = 0;

const priorityStatePath = path.join(outDir, "priority-state.json");
const previousPriorityState = loadPriorityState(priorityStatePath);

const scanTruncated = Boolean(maxTotalFiles && allFiles.length >= maxTotalFiles);
if (scanTruncated) scanWarnings.push(`File walk reached --max-total-files ${maxTotalFiles}; output is truncated.`);

cleanupManagedArtifacts();

if (actualIndexingLevel === 0) {
  let actualBytes = 0;
  const persistLevelZero = () => {
    writeFile("assessment-report.json", JSON.stringify({
      ...assessment,
      decision: indexingDecision,
      budgetPolicy,
      artifacts: {
        actualBytes,
        budgetBytes: effectiveBudgetBytes,
        budgetExceeded: actualBytes > effectiveBudgetBytes
      }
    }, null, 2));
    writeFile("assessment-state.json", JSON.stringify({
      assessedAt: assessment.assessedAt,
      score: assessment.score,
      recommendedLevel: assessment.recommendedLevel,
      actualLevel: 0,
      mode: indexingMode,
      budgetProfile: budgetPolicy.resolvedProfile,
      actualArtifactBytes: actualBytes,
      artifactBudgetBytes: effectiveBudgetBytes
    }, null, 2));
  };
  persistLevelZero();
  actualBytes = outputDirectoryBytes(outDir, isNavigationArtifact);
  persistLevelZero();
  actualBytes = outputDirectoryBytes(outDir, isNavigationArtifact);
  persistLevelZero();

  console.log(`Indexing assessment for ${target}`);
  console.log(`- mode: ${indexingMode}`);
  console.log(`- recommended auto level: ${assessment.recommendedLevel}`);
  console.log(`- actual level: 0 (${indexingDecision.reason})`);
  console.log(`- assessment-report.json`);
  console.log(`- assessment-state.json`);
  console.log("- no index generated; direct navigation is currently cheaper");
  if (scanWarnings.length) {
    console.log("Warnings:");
    for (const warning of scanWarnings) console.log(`- ${warning}`);
  }
  process.exit(0);
}

const changedFiles = getChangedFiles();
const candidateBaseFiles = (changedFiles ?? allFiles).sort();
const generatedFiles = candidateBaseFiles.filter(isGeneratedPath);
if (generatedFiles.length && !includeGenerated) {
  scanWarnings.push(`Excluded ${generatedFiles.length} generated-looking files from maps. Use --include-generated to include them.`);
}
const files = includeGenerated ? candidateBaseFiles : candidateBaseFiles.filter((f) => !isGeneratedPath(f));

const packageJson = readJson("package.json");
const packageManager = exists("pnpm-lock.yaml") || exists("pnpm-workspace.yaml")
  ? "pnpm"
  : exists("yarn.lock")
    ? "yarn"
    : exists("package-lock.json")
      ? "npm"
      : packageJson?.packageManager ?? "unknown";

const workspaceFiles = allFiles.filter((f) =>
  ["pnpm-workspace.yaml", "turbo.json", "nx.json", "package.json"].includes(f) || /(^|\/)package\.json$/.test(f)
);

const topLevelDirs = fs
  .readdirSync(target, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !IGNORE_DIRS.has(d.name))
  .map((d) => d.name)
  .sort();

const importantFiles = allFiles.filter((f) => matchAny(f, IMPORTANT_FILE_PATTERNS)).sort();
const allEntryCandidates = files.filter((f) => matchAny(f, ENTRY_CANDIDATE_PATTERNS)).sort();
const baseFileHintCandidates = files.filter((f) => matchAny(f, HEADER_CANDIDATE_PATTERNS)).sort();

const allRouteCandidates = files
  .filter((f) => /routes?|router|appRoutes/i.test(path.basename(f)) || /(^|\/)(pages|app|routes)\//.test(f))
  .filter((f) => /\.(tsx|ts|jsx|js|md)$/.test(f))
  .sort();

const allBehaviorCandidates = files
  .filter((f) => /badge|label|formatter|format|mapper|button|field|toggle|card|validator|validation|handler/i.test(path.basename(f)))
  .filter((f) => /\.(tsx|ts|jsx|js|md)$/.test(f))
  .sort();

const allApiCandidates = files
  .filter((f) => /api|client|openapi|swagger|query|mutation|endpoint/i.test(f))
  .filter((f) => /\.(tsx|ts|jsx|js|json|yaml|yml|md)$/.test(f))
  .sort();

const allStateCandidates = files
  .filter((f) => hasStateSignal(f))
  .filter((f) => /\.(tsx|ts|jsx|js|md)$/.test(f))
  .sort();

const allPackageCandidates = allFiles
  .filter((f) => /package\.json|pnpm-workspace|turbo\.json|nx\.json|vite\.config|next\.config|tsconfig|eslint|prettier|vitest|jest|playwright/i.test(f))
  .sort();

const pageDirs = files
  .filter((f) => /(^|\/)(pages|app|routes)\//.test(f))
  .map((f) => f.split("/").slice(0, 4).join("/"))
  .filter(Boolean);
const uniquePageDirs = [...new Set(pageDirs)].sort().slice(0, 80);

const allDomainBuckets = new Map();
for (const file of files) {
  const domain = extractDomain(file);
  if (!domain || domain.length < 2) continue;
  if (!allDomainBuckets.has(domain)) allDomainBuckets.set(domain, []);
  allDomainBuckets.get(domain).push(file);
}

const usageIndex = buildUsageIndex(usageEvents);
const changedSet = new Set((changedFiles ?? []).map((file) => file.replaceAll(path.sep, "/")));
const duplicateCounts = new Map();
for (const file of files) {
  const base = path.basename(file).toLowerCase();
  duplicateCounts.set(base, (duplicateCounts.get(base) ?? 0) + 1);
}

const previousSelectedPaths = new Set(
  (previousPriorityState?.shards ?? []).flatMap((shard) => (shard.entries ?? []).map((entry) => entry.path))
);
const pinnedPaths = new Set(budgetPolicy.pins.paths);
const analysisCandidates = [...new Set([
  ...allEntryCandidates,
  ...allRouteCandidates,
  ...allBehaviorCandidates,
  ...allApiCandidates,
  ...allStateCandidates,
  ...allPackageCandidates,
  ...[...allDomainBuckets.values()].flat()
])].sort((a, b) => {
  const aPreferred = pinnedPaths.has(a) || previousSelectedPaths.has(a) || changedSet.has(a);
  const bPreferred = pinnedPaths.has(b) || previousSelectedPaths.has(b) || changedSet.has(b);
  if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;
  return a.localeCompare(b);
});
const importAnalysisSet = new Set(analysisCandidates.slice(0, budgetPolicy.limits.maxAnalyzedFiles));
const fileMetrics = new Map();
for (const file of analysisCandidates) {
  const absolute = path.join(target, file);
  let fileBytes = 0;
  let importCount = 0;
  try {
    const stat = fs.statSync(absolute);
    fileBytes = stat.size;
    if (importAnalysisSet.has(file) && stat.size <= 512_000) {
      const text = fs.readFileSync(absolute, "utf8");
      importCount = (text.match(/\bimport\b|\brequire\s*\(|\bfrom\s*["']/g) ?? []).length;
    }
  } catch { /* one candidate may disappear during a scan */ }
  fileMetrics.set(file, { fileBytes, importCount });
}

function scoreShardEntries(shardId, items, kind) {
  const previousEntries = previousEntriesForShard(previousPriorityState, shardId);
  const previousMap = new Map(previousEntries.map((entry) => [entry.path, entry]));
  return [...new Set(items)].map((file) => {
    const hint = toFileHint(file, kind);
    const line = formatHintLine(file, kind);
    const metrics = fileMetrics.get(file) ?? { fileBytes: 0, importCount: 0 };
    return scoreIndexEntry({
      entry: {
        ...hint,
        estimatedBytes: Buffer.byteLength(`${line}\n`, "utf8")
      },
      usageIndex,
      duplicateCount: duplicateCounts.get(path.basename(file).toLowerCase()) ?? 1,
      fileBytes: metrics.fileBytes,
      importCount: metrics.importCount,
      recentlyChanged: changedSet.has(file),
      previous: previousMap.get(file) ?? null,
      policy: budgetPolicy
    });
  });
}

const rootShard = { id: "root", kind: "entry", required: true, entries: scoreShardEntries("root", allEntryCandidates, "entry") };
const coreShardCandidates = [
  { id: "routes", kind: "route/page", entries: scoreShardEntries("routes", allRouteCandidates, "route/page") },
  { id: "behavior", kind: "behavior", entries: scoreShardEntries("behavior", allBehaviorCandidates, "behavior") },
  { id: "api", kind: "API/query", entries: scoreShardEntries("api", allApiCandidates, "API/query") },
  { id: "state", kind: "state", entries: scoreShardEntries("state", allStateCandidates, "state") },
  { id: "packages", kind: "package/config", entries: scoreShardEntries("packages", allPackageCandidates, "package/config") }
].filter((shard) => shard.entries.length > 0);
const domainShardCandidates = [...allDomainBuckets.entries()]
  .filter(([, items]) => items.length >= 2)
  .map(([domain, items]) => ({
    id: `domain:${domain}`,
    domain,
    kind: "domain",
    count: items.length,
    entries: scoreShardEntries(`domain:${domain}`, items, "domain")
  }))
  .filter((shard) => shard.entries.length > 0);

const previousShardIds = (previousPriorityState?.shards ?? []).map((shard) => shard.id);
const maxShardCount = actualIndexingLevel >= 2 ? budgetPolicy.limits.maxShards : 0;
const domainSlotLimit = Math.min(maxDomainMaps, Math.max(0, maxShardCount - 2));
const selectedDomainShards = domainSlotLimit > 0
  ? chooseShards({
      shards: domainShardCandidates,
      maxShards: domainSlotLimit,
      previousShardIds,
      pinnedDomains: budgetPolicy.pins.domains
    })
  : [];
const remainingCoreSlots = Math.max(0, maxShardCount - 1 - selectedDomainShards.length);
const selectedCoreShards = remainingCoreSlots > 0
  ? chooseShards({
      shards: coreShardCandidates,
      maxShards: remainingCoreSlots,
      previousShardIds,
      pinnedDomains: budgetPolicy.pins.domains
    })
  : [];
const selectedShards = actualIndexingLevel >= 2 ? [rootShard, ...selectedCoreShards, ...selectedDomainShards] : [];
const coreSelectionCount = Math.max(1, 1 + selectedCoreShards.length);
const domainSelectionCount = Math.max(1, selectedDomainShards.length);
// Reserve fixed Markdown headings/rules so entry selection does not consume the entire artifact budget.
const estimatedShardOverheadBytes = 850;
const perCoreBudget = Math.min(
  budgetPolicy.limits.maxShardBytes,
  Math.max(500, Math.floor(budgetPolicy.limits.poolBytes.core / coreSelectionCount) - estimatedShardOverheadBytes)
);
const perDomainBudget = Math.min(
  budgetPolicy.limits.maxShardBytes,
  Math.max(500, Math.floor(budgetPolicy.limits.poolBytes.domains / domainSelectionCount) - estimatedShardOverheadBytes)
);

const shardSelections = selectedShards.map((shard) => selectEntriesWithinBudget({
  entries: shard.entries,
  shardId: shard.id,
  byteBudget: shard.domain ? perDomainBudget : perCoreBudget,
  maxEntries: maxFilesPerMap,
  previousEntries: previousEntriesForShard(previousPriorityState, shard.id),
  policy: budgetPolicy,
  minEntries: shard.required || (shard.domain && budgetPolicy.policy.preserveOnePerSelectedDomain) ? 1 : 0
}));
const selectionById = new Map(shardSelections.map((selection) => [selection.shardId, selection]));
const selectedPaths = (shardId) => (selectionById.get(shardId)?.selected ?? []).map((entry) => entry.path);

const entryCandidates = selectedPaths("root");
const routeCandidates = selectedPaths("routes");
const behaviorCandidates = selectedPaths("behavior");
const apiCandidates = selectedPaths("api");
const stateCandidates = selectedPaths("state");
const packageCandidates = selectedPaths("packages");
const selectedShardIds = new Set(selectedShards.map((shard) => shard.id));
const domainSummaries = selectedDomainShards.map((shard) => ({
  domain: shard.domain,
  files: selectedPaths(shard.id),
  count: shard.count,
  priority: shard.utility
}));
const fileHintCandidates = [...new Set([
  ...entryCandidates,
  ...routeCandidates,
  ...behaviorCandidates,
  ...apiCandidates,
  ...stateCandidates,
  ...packageCandidates,
  ...domainSummaries.flatMap((item) => item.files)
])].sort();
const sourceHeaderExceptionCandidates = allowSourceHeaders ? fileHintCandidates : [];
const selectedPriorityByPath = new Map();
for (const entry of shardSelections.flatMap((selection) => selection.selected)) {
  const previous = selectedPriorityByPath.get(entry.path);
  if (!previous || entry.priority > previous.priority) selectedPriorityByPath.set(entry.path, entry);
}

const generatedAt = new Date().toISOString();
const baseMapMeta = {
  confidence: "generated-only",
  lastVerified: null,
  source: "path-heuristic",
};
const mapDefinitions = [
  {
    id: "root",
    path: ".ai/indexing/maps/root.md",
    scope: ["top-level", "ambiguous", "vague-product"],
    keywords: ["전체", "어디", "기능", "화면", "흐름", "모름", "ambiguous"],
    tokenBudget: maxMapTokens,
    ...baseMapMeta,
  },
  {
    id: "routes",
    path: ".ai/indexing/maps/routes.md",
    scope: ["routes", "pages", "screens"],
    keywords: ["route", "router", "page", "screen", "url", "라우트", "페이지", "화면"],
    tokenBudget: maxMapTokens,
    ...baseMapMeta,
  },
  {
    id: "behavior",
    path: ".ai/indexing/maps/behavior.md",
    scope: ["behavior", "labels", "formatters", "validation", "ui-actions"],
    keywords: ["label", "badge", "format", "mapping", "button", "field", "toggle", "validation", "라벨", "포맷", "검증"],
    tokenBudget: maxMapTokens,
    ...baseMapMeta,
  },
  {
    id: "api",
    path: ".ai/indexing/maps/api.md",
    scope: ["api", "query", "client", "openapi", "backend"],
    keywords: ["api", "query", "mutation", "endpoint", "backend", "swagger", "openapi"],
    tokenBudget: maxMapTokens,
    ...baseMapMeta,
  },
  {
    id: "state",
    path: ".ai/indexing/maps/state.md",
    scope: ["state", "store", "cache", "session"],
    keywords: ["state", "store", "cache", "session", "zustand", "redux", "jotai", "recoil"],
    tokenBudget: maxMapTokens,
    ...baseMapMeta,
  },
  {
    id: "packages",
    path: ".ai/indexing/maps/packages.md",
    scope: ["packages", "workspace", "build", "config"],
    keywords: ["package", "workspace", "build", "config", "lint", "test", "설정"],
    tokenBudget: maxMapTokens,
    ...baseMapMeta,
  },
  ...domainSummaries.map(({ domain }) => ({
    id: `domain:${domain}`,
    path: `.ai/indexing/maps/domains/${domain}.md`,
    scope: ["domain", domain],
    keywords: [domain],
    tokenBudget: maxMapTokens,
    ...baseMapMeta,
  })),
];
const maps = mapDefinitions.filter((map) => selectedShardIds.has(map.id));
const priorityState = createPriorityState({
  policy: budgetPolicy,
  shardSelections,
  previousState: previousPriorityState,
  now: generatedAt
});
const priorityReport = {
  schemaVersion: 1,
  generatedAt,
  profile: budgetPolicy.resolvedProfile,
  requestedProfile: budgetPolicy.requestedProfile,
  totalBudgetBytes: effectiveBudgetBytes,
  pools: budgetPolicy.limits.poolBytes,
  roi: budgetPolicy.roi,
  limits: {
    maxShards: budgetPolicy.limits.maxShards,
    maxDomainShards: budgetPolicy.limits.maxDomainShards,
    maxEntriesPerShard: budgetPolicy.limits.maxEntriesPerShard,
    maxShardBytes: budgetPolicy.limits.maxShardBytes,
    minAddPriority: budgetPolicy.limits.minAddPriority,
    removeBelowPriority: budgetPolicy.limits.removeBelowPriority,
    minResidenceDays: budgetPolicy.limits.minResidenceDays,
    errorProtectionDays: budgetPolicy.limits.errorProtectionDays,
    maxReplacementRatioPerRun: budgetPolicy.limits.maxReplacementRatioPerRun
  },
  shards: shardSelections.map((selection) => ({
    id: selection.shardId,
    selected: selection.selected.length,
    dropped: selection.dropped.length,
    usedBytes: selection.usedBytes,
    budgetBytes: selection.byteBudget,
    retained: selection.retainedCount,
    previous: selection.previousCount,
    minimumRepresentativesRequested: selection.minimumRepresentativesRequested,
    minimumRepresentativesKept: selection.minimumRepresentativesKept,
    topSelected: selection.selected.slice(0, 5).map((entry) => ({
      path: entry.path,
      priority: entry.priority,
      density: Number(entry.density.toFixed(6)),
      pinned: entry.pinned,
      protected: entry.protected
    })),
    lowestDropped: selection.dropped
      .sort((a, b) => a.priority - b.priority || a.path.localeCompare(b.path))
      .slice(0, 3)
  }))
};

const report = {
  target,
  generatedAt,
  packageManager,
  packageName: packageJson?.name ?? null,
  scan: {
    mode: candidateOnly ? "candidate-only" : changedSince ? "changed-since" : "default",
    indexingMode,
    recommendedAutoLevel: assessment.recommendedLevel,
    actualIndexingLevel,
    forced: indexingDecision.forced,
    budgetProfile: budgetPolicy.resolvedProfile,
    requestedBudgetProfile: budgetPolicy.requestedProfile,
    totalBudgetBytes: effectiveBudgetBytes,
    selectedShardCount: maps.length,
    selectedDomainShardCount: domainSummaries.length,
    roiStatus: budgetPolicy.roi.status,
    respectGitignore,
    respectAiIgnore,
    denySensitivePaths,
    includeGenerated,
    allowSourceHeaders,
    maxMapTokens,
    changedSince,
    maxFilesPerMap,
    maxDomainMaps,
    maxTotalFiles: maxTotalFiles || null,
    maxDepth: maxDepth || null,
    excludePatterns,
    filesSeen: allFiles.length,
    filesIndexed: files.length,
    generatedFilesExcluded: includeGenerated ? 0 : generatedFiles.length,
    truncated: scanTruncated,
    warnings: scanWarnings,
  },
  topLevelDirs,
  workspaceFiles,
  importantFiles,
  entryCandidates,
  routeCandidates: routeCandidates.slice(0, 160),
  behaviorCandidates: behaviorCandidates.slice(0, 160),
  apiCandidates: apiCandidates.slice(0, 160),
  stateCandidates: stateCandidates.slice(0, 160),
  packageCandidates: packageCandidates.slice(0, 160),
  fileHintCandidates: fileHintCandidates.slice(0, 160),
  sourceHeaderExceptionCandidates: sourceHeaderExceptionCandidates.slice(0, 80),
  pageDirs: uniquePageDirs,
  domainSummaries,
  maps,
  assessment,
  indexingDecision,
  budgetPolicy,
  priority: priorityReport
};

fs.mkdirSync(outDir, { recursive: true });

const scanWarningBlock = scanWarnings.length
  ? scanWarnings.map((warning) => `- ${warning}`).join("\n")
  : "- none";

const aiIndexCandidate = `# AI Navigation Index Candidate

Generated by \`joo-indexing-scan.mjs\`. Disposable routing hints only; source/imports/tests are authoritative.

## Project

- name: ${report.packageName ?? "TODO"}
- package manager: ${report.packageManager}
- indexing level: ${report.scan.actualIndexingLevel}
- budget profile: ${report.scan.budgetProfile}
- navigation budget: ${report.scan.totalBudgetBytes} bytes
- ROI evidence: ${report.scan.roiStatus}

## Runtime Rule

1. Exact paths, changed files, errors, and failing tests beat this index.
2. Otherwise read at most one matching map below.
3. Open source immediately, then follow only imports needed for unresolved concerns.
4. Do not read maintenance files such as \`priority-report.json\`, \`priority-state.json\`, or \`assessment-report.json\`.

## Available Shards

${maps.length
  ? maps.map((map) => "- " + map.scope.join(", ") + ": `" + map.path + "`").join("\n")
  : "- none at this level; use targeted filename/symbol search"}

## Trust Rule

Generated metadata is a hint, not truth. Report stale entries and continue from source.
`;

const compactFileMapEntries = [];
let compactFileMapBytes = 300;
if (emitFileMapAllowed) {
  const ranked = [...selectedPriorityByPath.values()].sort((a, b) => b.density - a.density || b.priority - a.priority || a.path.localeCompare(b.path));
  for (const entry of ranked) {
    const compact = {
      path: entry.path,
      role: entry.role,
      concern: entry.concern,
      domain: entry.domain || undefined,
      anchors: entry.anchors?.slice(0, 6) ?? [],
      confidence: entry.confidence
    };
    const bytes = Buffer.byteLength(JSON.stringify(compact), "utf8") + 2;
    if (compactFileMapBytes + bytes > budgetPolicy.limits.poolBytes.fileMap) continue;
    compactFileMapEntries.push(compact);
    compactFileMapBytes += bytes;
  }
}
const emitFileMap = emitFileMapAllowed && compactFileMapEntries.length > 0;
const fileMapCandidate = {
  schemaVersion: 2,
  kind: "budgeted-file-map-candidate",
  generatedAt,
  source: "joo-indexing-scan.mjs",
  policy: {
    profile: budgetPolicy.resolvedProfile,
    byteBudget: budgetPolicy.limits.poolBytes.fileMap,
    selectedEntries: compactFileMapEntries.length,
    metadataIsHintNotTruth: true,
    exactPathLookupBeforeBroadMapRead: true
  },
  entries: compactFileMapEntries
};

const fileHintsCandidateMd = `# File Hints Candidate

Generated by \`joo-indexing-scan.mjs\`.

Source-level \`@ai-*\` headers are disabled by default. Store file hints in sidecar maps instead:

- \`.ai/indexing/maps/*\`
- \`.ai/indexing/file-map.candidate.json\`

Use this file as review input. Do not copy blindly.

## Policy

- Source files must not fail lint or max-lines rules because of AI metadata.
- File hints are navigation hints, not documentation and not instructions.
- Prefer exact path lookup in the sidecar map when the user names a file.
- Keep map entries compact: path, role, concern, scope, domain, anchors, keywords, related, confidence, lastVerified.
- Do not put agent commands inside map entries.

## Candidate Entries

${fileHintCandidates
  .slice(0, 160)
  .map((f) => {
    const hint = toFileHint(f, "file");
    const domain = hint.domain ? `; domain: ${hint.domain}` : "";
    const anchors = hint.anchors.length ? `; anchors: ${hint.anchors.join(", ")}` : "";
    return `- \`${f}\`; role: ${hint.role}; concern: ${hint.concern}; scope: ${hint.scope}${domain}${anchors}; confidence: ${hint.confidence}`;
  })
  .join("\n") || "- none detected"}
`;

const compactReport = {
  target: report.target,
  generatedAt: report.generatedAt,
  packageManager: report.packageManager,
  packageName: report.packageName,
  scan: report.scan,
  topLevelDirs: report.topLevelDirs,
  domainSummaries: report.domainSummaries.map(({ domain, count }) => ({ domain, count })),
  maps: report.maps,
  assessment: report.assessment,
  indexingDecision: report.indexingDecision,
  budget: {
    profile: budgetPolicy.resolvedProfile,
    totalBytes: effectiveBudgetBytes,
    roiStatus: budgetPolicy.roi.status,
    selectedShards: maps.length,
    selectedEntries: shardSelections.reduce((sum, selection) => sum + selection.selected.length, 0)
  }
};

const sourceHeaderExceptionsMd = `# Source Header Exceptions

Generated by \`joo-indexing-scan.mjs\`.

Source-level \`@ai-*\` headers are disabled by default. This file exists only for projects that explicitly opt in with \`--source-headers\`.

## Default

Do not add \`@ai-*\` headers to source files.

## Exception Policy

A source-level header is allowed only when all are true:

- project explicitly allows source-level AI metadata
- file is a stable high-value entry boundary
- header is max 2 lines
- header will not violate max-lines lint rules
- header contains no agent commands

## Exception Candidates

${sourceHeaderExceptionCandidates
  .slice(0, 80)
  .map((f) => `- \`${f}\`: stable-entry candidate; confidence: ${confidenceFor(f)}`)
  .join("\n") || "- none; run with --source-headers only if the project explicitly allows source headers"}
`;

writeFile("assessment-report.json", JSON.stringify({
  ...assessment,
  decision: indexingDecision,
  budgetPolicy
}, null, 2));
writeFile("assessment-state.json", JSON.stringify({
  assessedAt: assessment.assessedAt,
  score: assessment.score,
  recommendedLevel: assessment.recommendedLevel,
  actualLevel: actualIndexingLevel,
  mode: indexingMode,
  budgetProfile: budgetPolicy.resolvedProfile,
  roiStatus: budgetPolicy.roi.status
}, null, 2));
writeFile("priority-state.json", JSON.stringify(priorityState, null, 2));
if (budgetPolicy.policy.recordPriorityDetails) writeFile("priority-report.json", JSON.stringify(priorityReport, null, 2));

if (actualIndexingLevel >= 1) {
  writeFile("indexing-report.json", JSON.stringify(compactReport, null, 2));
  writeFile("AI_INDEX.candidate.md", aiIndexCandidate);
}
if (emitFileMap) writeFile("file-map.candidate.json", JSON.stringify(fileMapCandidate, null, 2));
if (emitDetailedHints) writeFile("file-hints.candidate.md", fileHintsCandidateMd);
if (emitDetailedHints && allowSourceHeaders) writeFile("source-header-exceptions.md", sourceHeaderExceptionsMd);

function companionHint(shardId, availableText, fallbackText) {
  return selectedShardIds.has(shardId) ? availableText : fallbackText;
}

function mapHeader(title) {
  return `# ${title}

Generated by \`joo-indexing-scan.mjs\`.

## Metadata

- confidence: generated-only
- last_verified: unknown
- source: path-heuristic
- files_indexed: ${report.scan.filesIndexed}
`;
}

if (emitMaps) {
  const manifest = {
    version: 3,
    generatedAt,
    project: { name: report.packageName ?? null },
    indexing: {
      mode: indexingMode,
      level: actualIndexingLevel,
      profile: budgetPolicy.resolvedProfile,
      navigationBudgetBytes: effectiveBudgetBytes,
      roiStatus: budgetPolicy.roi.status
    },
    policy: {
      mapReadLimit: 1,
      companionMapLimit: 1,
      sourceBeforeDecision: 3,
      metadataIsHintNotTruth: true,
      exactAnchorsBeatIndex: true
    },
    maps: maps.map(({ id, path: mapPath, scope, keywords }) => ({ id, path: mapPath, scope, keywords }))
  };

  writeFile("manifest.json", JSON.stringify(manifest, null, 2));

  writeFile("maps/root.md", `${mapHeader("Root Map")}
## Scope

Use this only for vague product/design/planning requests or when the task area is unclear.

## Top-Level Areas

${report.topLevelDirs.map((d) => `- \`${d}/\`: top-level area`).join("\n") || "- none detected"}

## Existing Navigation Files

${importantFiles
  .filter((f) => /AGENTS\.md|CLAUDE\.md|AI_INDEX\.md|rules\//.test(f))
  .map((f) => `- \`${f}\``)
  .join("\n") || "- none detected"}

## Available Map Shards

${maps.map((m) => `- \`${m.path}\`: ${m.scope.join(", ")}; confidence: ${m.confidence}`).join("\n")}

## Entry Candidates

${asFileMap(entryCandidates, "entry")}

## Read Rule

Read one likely shard next. Do not read all shards.

If a likely source file is found, follow only imports that can cover unresolved concerns. Stop when required concerns are covered instead of reading more maps.

Use one companion shard only when a coupling signal exists.
`);

  if (selectedShardIds.has("routes")) writeFile("maps/routes.md", `${mapHeader("Routes / Pages Map")}
## Scope

Routes, pages, screens, navigation, layouts, route guards.

## First Read

${asFileMap(routeCandidates, "route/page")}

## Cheap Escalation

${companionHint("api", "- route/page + data issue -> also read `maps/api.md`", "- API shard omitted by budget; use one targeted API/query search if data remains unresolved")}
${companionHint("state", "- route/page + session/permission issue -> also read `maps/state.md`", "- State shard omitted by budget; use one targeted store/session search if state remains unresolved")}

## Do Not Start Here

- generic UI atoms unless the task is purely visual
- generated route files unless directly edited by humans
- full directory scans of all pages

## Staleness Triggers

- route files renamed or moved
- page folders added, removed, or renamed
- route guards/layout shells changed
- route-to-page mapping changed
`);

  if (selectedShardIds.has("behavior")) writeFile("maps/behavior.md", `${mapHeader("Behavior Owners Map")}
## Scope

Concrete labels, badges, formatters, mappers, validation, buttons, fields, toggles, and UI action handlers.

## First Read

${asFileMap(behaviorCandidates, "behavior")}

## Read Rule

Concrete behavior anchors beat generic route/page entries. Follow related imports only when another required concern remains uncovered.

## Do Not Start Here

- generic shared UI atoms without a matching concrete anchor
- parent routes when the task asks for a label, mapping, formatter, validation, or UI action

## Staleness Triggers

- visible label/status mapping moved
- formatter/validator ownership changed
- UI action handler moved to a hook or state boundary
`);

  if (selectedShardIds.has("api")) writeFile("maps/api.md", `${mapHeader("API / Query Map")}
## Scope

API clients, query/mutation hooks, OpenAPI/Swagger integration, backend endpoint mapping.

## First Read

${asFileMap(apiCandidates, "API/query")}

## Read Rule

After finding the API/query entry, follow imports to types, generated clients, or domain services only for unresolved concerns.

Inspect generated clients only at the exact operation/type boundary.

## Cheap Escalation

${companionHint("routes", "- API task + visible page behavior -> also read `maps/routes.md`", "- Routes shard omitted by budget; use one targeted page/route search if surface context remains unresolved")}
${companionHint("state", "- API task + session/auth behavior -> also read `maps/state.md`", "- State shard omitted by budget; use one targeted session/state search if state remains unresolved")}

## Do Not Start Here

- generated API outputs unless the task is about generated code
- full backend specs when only one endpoint is relevant

## Staleness Triggers

- API client architecture changed
- query library/provider changed
- endpoint naming or OpenAPI source changed
- generated client path changed
`);

  if (selectedShardIds.has("state")) writeFile("maps/state.md", `${mapHeader("State / Store Map")}
## Scope

Global state, stores, atoms, cache, session state, client-side persistence.

## First Read

${asFileMap(stateCandidates, "state")}

## Read Rule

After finding the state entry, follow imports to selectors, actions, persistence, or API calls only for unresolved concerns.

## Cheap Escalation

${companionHint("routes", "- state/session + route guard issue -> also read `maps/routes.md`", "- Routes shard omitted by budget; use one targeted route/guard search if navigation remains unresolved")}
${companionHint("api", "- cache/query ownership issue -> also read `maps/api.md`", "- API shard omitted by budget; use one targeted query/cache search if data ownership remains unresolved")}

## Do Not Start Here

- local component state unless the task names that component
- generated types or snapshots

## Staleness Triggers

- store library changed
- global/session state moved
- cache/query ownership changed
- state entry files renamed
`);

  if (selectedShardIds.has("packages")) writeFile("maps/packages.md", `${mapHeader("Packages / Config Map")}
## Scope

Package manager, workspace layout, build/test/lint config, monorepo package boundaries.

## First Read

${asFileMap(packageCandidates, "package/config")}

## Workspace Files

${asList(workspaceFiles)}

## Read Rule

Use this map for dependency, package, script, build, lint, or test setup tasks.

For runtime failures, read the exact failing package/config file before broad package search.

## Staleness Triggers

- package manager changed
- workspace package added/removed
- build/test/lint config moved
- monorepo tool changed
`);

  for (const { domain, files: domainFiles, count } of domainSummaries) {
    writeFile(`maps/domains/${domain}.md`, `${mapHeader(`Domain Map: ${domain}`)}
## Scope

Domain-like area inferred from paths containing \`${domain}\`.

Detected files: ${count}

## First Read

${asFileMap(domainFiles, "domain")}

## Read Rule

Use this shard only when the user request clearly maps to \`${domain}\` or root/routes/api/state maps point here.

After finding a source entry, follow only imports that can cover unresolved concerns; stop when coverage is complete instead of reading other domain maps.

Use one companion shard only when a route/API/state coupling signal exists.

## Staleness Triggers

- domain folder renamed or moved
- domain route/API/state ownership changed
- first-read files changed
`);
  }
}

function outputDirectoryBytes(dir, predicate = () => true, base = dir) {
  let total = 0;
  if (!fs.existsSync(dir)) return total;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) total += outputDirectoryBytes(absolute, predicate, base);
    else if (entry.isFile()) {
      const relative = path.relative(base, absolute).replaceAll(path.sep, "/");
      if (predicate(relative)) total += fs.statSync(absolute).size;
    }
  }
  return total;
}

function isNavigationArtifact(relative) {
  return relative === "AI_INDEX.candidate.md"
    || relative === "manifest.json"
    || relative === "file-map.candidate.json"
    || relative === "file-hints.candidate.md"
    || relative === "source-header-exceptions.md"
    || relative.startsWith("maps/");
}

let totalArtifactBytes = outputDirectoryBytes(outDir);
let actualArtifactBytes = outputDirectoryBytes(outDir, isNavigationArtifact);
let maintenanceArtifactBytes = Math.max(0, totalArtifactBytes - actualArtifactBytes);
let artifactBudgetExceeded = actualArtifactBytes > effectiveBudgetBytes;
function persistAssessmentWithArtifactSize() {
  writeFile("assessment-report.json", JSON.stringify({
    ...assessment,
    decision: indexingDecision,
    budgetPolicy,
    artifacts: {
      actualBytes: actualArtifactBytes,
      navigationBytes: actualArtifactBytes,
      maintenanceBytes: maintenanceArtifactBytes,
      totalBytes: totalArtifactBytes,
      budgetBytes: effectiveBudgetBytes,
      budgetExceeded: artifactBudgetExceeded
    }
  }, null, 2));
  writeFile("assessment-state.json", JSON.stringify({
    assessedAt: assessment.assessedAt,
    score: assessment.score,
    recommendedLevel: assessment.recommendedLevel,
    actualLevel: actualIndexingLevel,
    mode: indexingMode,
    budgetProfile: budgetPolicy.resolvedProfile,
    roiStatus: budgetPolicy.roi.status,
    actualArtifactBytes,
    maintenanceArtifactBytes,
    artifactBudgetBytes: effectiveBudgetBytes
  }, null, 2));
}
persistAssessmentWithArtifactSize();
totalArtifactBytes = outputDirectoryBytes(outDir);
actualArtifactBytes = outputDirectoryBytes(outDir, isNavigationArtifact);
maintenanceArtifactBytes = Math.max(0, totalArtifactBytes - actualArtifactBytes);
artifactBudgetExceeded = actualArtifactBytes > effectiveBudgetBytes;
persistAssessmentWithArtifactSize();
if (artifactBudgetExceeded) {
  scanWarnings.push(`Navigation index output is ${actualArtifactBytes} bytes, above the ${effectiveBudgetBytes}-byte ${budgetPolicy.resolvedProfile} budget. Pinned/protected entries or fixed map overhead may require a larger profile.`);
}

console.log(`Indexing assessment for ${target}`);
console.log(`- mode: ${indexingMode}`);
console.log(`- recommended auto level: ${assessment.recommendedLevel}`);
console.log(`- actual level: ${actualIndexingLevel} (${indexingDecision.reason})`);
console.log(`- budget profile: ${budgetPolicy.resolvedProfile}`);
console.log(`- navigation budget: ${effectiveBudgetBytes} bytes`);
console.log(`- ROI evidence: ${budgetPolicy.roi.status}`);
console.log(`- assessment-report.json`);
console.log(`- assessment-state.json`);
if (actualIndexingLevel === 0) {
  console.log("- no index generated; direct navigation is currently cheaper");
} else {
  console.log(`Wrote indexing candidates to ${outDir}`);
  console.log(`- AI_INDEX.candidate.md`);
  console.log(`- indexing-report.json`);
  if (budgetPolicy.policy.recordPriorityDetails) console.log(`- priority-report.json (maintenance only)`);
  if (emitFileMap) console.log(`- file-map.candidate.json`);
  if (emitDetailedHints) console.log(`- file-hints.candidate.md`);
  if (emitDetailedHints && allowSourceHeaders) console.log(`- source-header-exceptions.md`);
}
if (emitMaps) {
  console.log(`- manifest.json`);
  for (const map of maps.filter((item) => !item.id.startsWith("domain:"))) console.log(`- ${map.path.replace(/^\.ai\/indexing\//, "")}`);
  if (domainSummaries.length) console.log(`- maps/domains/*.md (${domainSummaries.length})`);
}
if (scanWarnings.length) {
  console.log(`Warnings:`);
  for (const warning of scanWarnings) console.log(`- ${warning}`);
}

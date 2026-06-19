import fs from "node:fs";
import path from "node:path";

const SOURCE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte",
  ".py", ".rb", ".php", ".java", ".kt", ".kts", ".go", ".rs", ".cs",
  ".c", ".cc", ".cpp", ".h", ".hpp", ".swift", ".scala", ".sql"
]);

const DEFAULT_IGNORED_DIRS = new Set([
  ".git", ".ai", "node_modules", "dist", "build", ".next", ".nuxt", ".turbo",
  "coverage", ".cache", ".vercel", "storybook-static", "vendor", "target", "out"
]);

const DISTRACTOR_SEGMENTS = new Set([
  "legacy", "archive", "archives", "example", "examples", "playground", "fixtures",
  "stories", "storybook", "generated", "__generated__", "gen"
]);

function normalizePath(value) {
  return String(value ?? "").replaceAll(path.sep, "/").replace(/^\.\//, "");
}

function isSourceFile(file) {
  return SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase());
}

function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function collectDomainNames(files) {
  const domains = new Set();
  const markers = new Set(["features", "entities", "domains", "modules", "pages"]);
  for (const file of files) {
    const parts = normalizePath(file).split("/");
    for (let i = 0; i < parts.length - 1; i += 1) {
      if (markers.has(parts[i]) && parts[i + 1]) domains.add(parts[i + 1].toLowerCase());
    }
  }
  return domains;
}

function duplicateBasenameRatio(files) {
  if (!files.length) return 0;
  const counts = new Map();
  for (const file of files) {
    const base = path.basename(file).toLowerCase();
    counts.set(base, (counts.get(base) ?? 0) + 1);
  }
  const duplicatedFiles = files.filter((file) => (counts.get(path.basename(file).toLowerCase()) ?? 0) > 1).length;
  return duplicatedFiles / files.length;
}

function distractorRatio(files) {
  if (!files.length) return 0;
  const count = files.filter((file) => normalizePath(file).split("/").some((segment) => DISTRACTOR_SEGMENTS.has(segment.toLowerCase()))).length;
  return count / files.length;
}

function countApps(files) {
  const apps = new Set();
  for (const file of files) {
    const parts = normalizePath(file).split("/");
    const appsIndex = parts.indexOf("apps");
    if (appsIndex >= 0 && parts[appsIndex + 1]) apps.add(parts[appsIndex + 1]);
  }
  return apps.size;
}

function lineAndByteMetrics(target, sourceFiles) {
  let sourceBytes = 0;
  const readable = [];
  for (const file of sourceFiles) {
    const absolute = path.join(target, file);
    try {
      const stat = fs.statSync(absolute);
      sourceBytes += stat.size;
      if (stat.size <= 2_000_000) readable.push({ absolute, size: stat.size });
    } catch {
      // Missing or unreadable files are ignored; assessment remains conservative.
    }
  }

  // Assessment must stay cheaper than indexing. Sample at most 200 files and estimate LOC.
  const sampleLimit = 200;
  const step = Math.max(1, Math.ceil(readable.length / sampleLimit));
  const sample = readable.filter((_, index) => index % step === 0).slice(0, sampleLimit);
  let sampledBytes = 0;
  let sampledLines = 0;
  for (const item of sample) {
    try {
      const text = fs.readFileSync(item.absolute, "utf8");
      sampledBytes += item.size;
      sampledLines += text ? text.split(/\r?\n/).length : 0;
    } catch { /* ignore one unreadable sample */ }
  }
  const sourceLines = sampledBytes > 0
    ? Math.round(sampledLines * (sourceBytes / sampledBytes))
    : 0;
  return {
    sourceBytes,
    sourceLines,
    sourceLinesEstimated: readable.length > sample.length,
    sampledSourceFiles: sample.length
  };
}

function readRuntimeUsage(target) {
  const usagePath = path.join(target, ".ai", "indexing", "local-usage.json");
  if (!fs.existsSync(usagePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(usagePath, "utf8"));
    const runs = Array.isArray(parsed.runs) ? parsed.runs.slice(-20) : [];
    if (!runs.length) return null;
    return {
      sampleSize: runs.length,
      medianCommands: median(runs.map((run) => Number(run.commandCount))),
      medianToolOutputChars: median(runs.map((run) => Number(run.toolOutputChars))),
      broadSearchRate: runs.filter((run) => Boolean(run.broadSearch)).length / runs.length,
      wrongCandidateRate: runs.filter((run) => Number(run.wrongCandidates ?? 0) > 0).length / runs.length
    };
  } catch {
    return null;
  }
}

export function recommendedLevelForScore(score) {
  if (score < 25) return 0;
  if (score < 45) return 1;
  if (score < 70) return 2;
  return 3;
}

function applyHysteresis(recommendedLevel, score, previousLevel) {
  if (!Number.isInteger(previousLevel) || previousLevel < 0 || previousLevel > 3) return recommendedLevel;
  if (recommendedLevel >= previousLevel) return recommendedLevel;
  const demotionFloors = { 3: 60, 2: 35, 1: 15 };
  return score < (demotionFloors[previousLevel] ?? 0) ? recommendedLevel : previousLevel;
}

export function resolveIndexingDecision({ mode = "auto", requestedLevel = null, recommendedLevel, score, previousLevel = null }) {
  const normalizedMode = String(mode || "auto").toLowerCase();
  if (!["auto", "force", "off"].includes(normalizedMode)) {
    throw new Error(`Unsupported indexing mode: ${mode}. Use auto, force, or off.`);
  }
  if (requestedLevel !== null && requestedLevel !== undefined && requestedLevel !== "") {
    const level = Number(requestedLevel);
    if (!Number.isInteger(level) || level < 0 || level > 3) throw new Error(`Invalid indexing level: ${requestedLevel}. Use 0, 1, 2, or 3.`);
    return { mode: normalizedMode, actualLevel: level, forced: true, reason: "explicit-level" };
  }
  if (normalizedMode === "off") return { mode: normalizedMode, actualLevel: 0, forced: true, reason: "mode-off" };
  if (normalizedMode === "force") return { mode: normalizedMode, actualLevel: 3, forced: true, reason: "mode-force" };
  return {
    mode: normalizedMode,
    actualLevel: applyHysteresis(recommendedLevel, score, previousLevel),
    forced: false,
    reason: previousLevel === null ? "auto-score" : "auto-score-with-hysteresis"
  };
}

export function assessRepositoryFiles({ target, files, previousLevel = null, runtimeUsage = undefined }) {
  const normalizedFiles = [...new Set(files.map(normalizePath))];
  const sourceFiles = normalizedFiles.filter(isSourceFile);
  const packageFiles = normalizedFiles.filter((file) => /(^|\/)package\.json$/.test(file));
  const { sourceBytes, sourceLines, sourceLinesEstimated, sampledSourceFiles } = lineAndByteMetrics(target, sourceFiles);
  const duplicateRatio = duplicateBasenameRatio(sourceFiles);
  const productionDistractorRatio = distractorRatio(sourceFiles);
  const workspaceCount = packageFiles.length;
  const appCount = countApps(sourceFiles);
  const domainCount = collectDomainNames(sourceFiles).size;
  const maxDepth = normalizedFiles.reduce((max, file) => Math.max(max, normalizePath(file).split("/").length), 0);
  const observed = runtimeUsage === undefined ? readRuntimeUsage(target) : runtimeUsage;

  let score = 0;
  const reasons = [];
  const add = (points, reason) => { score += points; reasons.push({ points, reason }); };

  if (sourceFiles.length >= 300) add(10, "300+ source files");
  if (sourceFiles.length >= 1000) add(15, "1000+ source files");
  if (sourceLines >= 50_000) add(10, "50k+ source lines");
  if (sourceLines >= 200_000) add(10, "200k+ source lines");
  if (workspaceCount >= 4) add(10, "multiple workspaces/packages");
  if (appCount >= 3) add(10, "three or more applications");
  if (domainCount >= 15) add(10, "many feature/domain areas");
  if (duplicateRatio >= 0.10) add(15, "high duplicate basename ratio");
  if (duplicateRatio >= 0.25) add(10, "very high duplicate basename ratio");
  if (productionDistractorRatio >= 0.10) add(15, "production code mixed with distractor trees");
  if (maxDepth >= 8) add(5, "deep directory structure");

  if (observed?.medianCommands >= 8) add(20, "observed navigation requires many commands");
  if (observed?.medianToolOutputChars >= 15_000) add(20, "observed navigation produces large tool output");
  if (observed?.broadSearchRate >= 0.4) add(15, "broad search is frequently required");
  if (observed?.wrongCandidateRate >= 0.3) add(10, "wrong candidates are frequently opened");

  const rawRecommendedLevel = recommendedLevelForScore(score);
  const recommendedLevel = applyHysteresis(rawRecommendedLevel, score, previousLevel);
  const maxIndexBytes = Math.min(2_000_000, Math.max(40_000, Math.round(sourceBytes * 0.05)));
  const recommendedArtifacts = recommendedLevel === 0
    ? ["assessment-report.json"]
    : recommendedLevel === 1
      ? ["assessment-report.json", "AI_INDEX.candidate.md"]
      : recommendedLevel === 2
        ? ["assessment-report.json", "AI_INDEX.candidate.md", "manifest.json", "maps/core", "maps/domains/selected"]
        : ["assessment-report.json", "AI_INDEX.candidate.md", "manifest.json", "maps/*", "file-map.candidate.json"];

  return {
    schemaVersion: 1,
    assessedAt: new Date().toISOString(),
    target,
    score,
    rawRecommendedLevel,
    recommendedLevel,
    previousLevel,
    metrics: {
      filesSeen: normalizedFiles.length,
      sourceFiles: sourceFiles.length,
      sourceLines,
      sourceBytes,
      sourceLinesEstimated,
      sampledSourceFiles,
      workspaceCount,
      appCount,
      domainCount,
      duplicateBasenameRatio: duplicateRatio,
      productionDistractorRatio,
      maxDepth
    },
    runtimeUsage: observed,
    reasons,
    budget: {
      maxIndexBytes,
      maxIndexToSourceRatio: 0.05,
      absoluteMaxIndexBytes: 2_000_000
    },
    recommendedArtifacts
  };
}

export function collectRepositoryFiles(target, ignoredDirs = DEFAULT_IGNORED_DIRS) {
  const output = [];
  function walk(dir) {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
      const absolute = path.join(dir, entry.name);
      const relative = normalizePath(path.relative(target, absolute));
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) output.push(relative);
    }
  }
  walk(target);
  return output;
}

export function assessRepositoryPath({ target, previousLevel = null, runtimeUsage = undefined }) {
  return assessRepositoryFiles({ target, files: collectRepositoryFiles(target), previousLevel, runtimeUsage });
}

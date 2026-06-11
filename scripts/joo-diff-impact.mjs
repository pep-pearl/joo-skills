#!/usr/bin/env node

/**
 * Build a targeted PR/diff impact read plan from changed files.
 *
 * This script is intentionally path-first and conservative:
 * - changed files are anchors
 * - source/imports/tests beat AI metadata
 * - map shards are suggested only when the diff affects navigation metadata
 * - no full repo scan is required for the default output
 *
 * Examples:
 *   node scripts/joo-diff-impact.mjs --base main
 *   node scripts/joo-diff-impact.mjs --staged
 *   node scripts/joo-diff-impact.mjs --changed-files src/pages/a.tsx,src/api/client.ts
 *   node scripts/joo-diff-impact.mjs --base main --review --include-imports
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  classifyPath,
  extractDomain,
  isGeneratedPath,
  isMetadataPath,
  isTestPath,
  isTextLikePath,
  mapShardForClass,
  normalizeMapsRoot,
  normalizePath,
  roleForPath,
} from "./lib/joo-path-classifier.mjs";

const args = process.argv.slice(2);

function getArg(name, fallback = null) {
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

const target = path.resolve(getArg("--target", "."));
const base = getArg("--base", getArg("--changed-since", "main"));
const changedFilesArg = getArg("--changed-files", "");
const mapsRoot = normalizeMapsRoot(getArg("--maps", path.join(".ai", "indexing", "maps")));
const includeImports = hasFlag("--include-imports");
const includeTests = !hasFlag("--no-tests");
const jsonOnly = hasFlag("--json");
const maxReadNext = Number(getArg("--max-read-next", "20"));
const outputMode = hasFlag("--review") ? "review" : hasFlag("--fix-plan") ? "fix-plan" : getArg("--mode", "impact");

function runGit(commandArgs) {
  return execFileSync("git", commandArgs, { cwd: target, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function parseChangedFilesArgument(value) {
  return value
    .split(/[\n,]+/)
    .map(normalizePath)
    .filter(Boolean)
    .map((file) => ({ path: file, status: "modified", rawStatus: "M" }));
}

function parseNameStatus(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t+/);
      const rawStatus = parts[0] || "M";
      const statusCode = rawStatus[0];
      const statusMap = {
        A: "added",
        C: "copied",
        D: "deleted",
        M: "modified",
        R: "renamed",
        T: "type-changed",
        U: "unmerged",
      };

      if (statusCode === "R" || statusCode === "C") {
        return {
          path: normalizePath(parts[2]),
          previousPath: normalizePath(parts[1]),
          status: statusMap[statusCode] || "modified",
          rawStatus,
        };
      }

      return {
        path: normalizePath(parts[1] || parts[0]),
        status: statusMap[statusCode] || "modified",
        rawStatus,
      };
    })
    .filter((entry) => entry.path);
}

function getDiffEntries() {
  if (changedFilesArg) return { mode: "changed-files", entries: parseChangedFilesArgument(changedFilesArg) };

  const candidates = [];
  if (hasFlag("--staged")) {
    candidates.push({ mode: "staged", command: ["diff", "--cached", "--name-status", "--find-renames"] });
  } else if (hasFlag("--working")) {
    candidates.push({ mode: "working", command: ["diff", "--name-status", "--find-renames"] });
  } else {
    candidates.push(
      { mode: "base", command: ["diff", "--name-status", "--find-renames", `${base}...HEAD`] },
      { mode: "base", command: ["diff", "--name-status", "--find-renames", base] },
      { mode: "working", command: ["diff", "--name-status", "--find-renames", "HEAD"] }
    );
  }

  for (const candidate of candidates) {
    try {
      const output = runGit(candidate.command);
      if (output) return { mode: candidate.mode, entries: parseNameStatus(output) };
    } catch {
      // try next strategy
    }
  }

  return { mode: hasFlag("--staged") ? "staged" : hasFlag("--working") ? "working" : "base", entries: [] };
}

function fileExists(rel) {
  return fs.existsSync(path.join(target, rel));
}

function canReadForImports(rel) {
  if (!rel || !fileExists(rel)) return false;
  if (isGeneratedPath(rel) || isMetadataPath(rel, { mapsRoot })) return false;
  if (!isTextLikePath(rel)) return false;
  return /\.(tsx|ts|jsx|js|mjs|cjs|mts|cts)$/.test(rel);
}

function uniqueByPath(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.path || item;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function resolveRelativeImport(fromFile, specifier) {
  if (!specifier.startsWith(".")) return null;

  const baseDir = path.dirname(fromFile);
  const withoutExt = normalizePath(path.join(baseDir, specifier));
  const candidates = [
    withoutExt,
    `${withoutExt}.ts`,
    `${withoutExt}.tsx`,
    `${withoutExt}.js`,
    `${withoutExt}.jsx`,
    `${withoutExt}.mjs`,
    `${withoutExt}.cjs`,
    `${withoutExt}.json`,
    `${withoutExt}/index.ts`,
    `${withoutExt}/index.tsx`,
    `${withoutExt}/index.js`,
    `${withoutExt}/index.jsx`,
    `${withoutExt}/index.mjs`,
    `${withoutExt}/index.cjs`,
  ];

  return candidates.find(fileExists) || null;
}

function extractDirectImports(file) {
  if (!canReadForImports(file)) return [];

  let source = "";
  try {
    source = fs.readFileSync(path.join(target, file), "utf8");
  } catch {
    return [];
  }

  const importSpecs = new Set();
  const patterns = [
    /(?:^|\n)\s*import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
    /(?:^|\n)\s*export\s+(?:type\s+)?[\s\S]*?\s+from\s+["']([^"']+)["']/g,
    /import\(["']([^"']+)["']\)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source))) importSpecs.add(match[1]);
  }

  return [...importSpecs]
    .map((specifier) => ({ specifier, path: resolveRelativeImport(file, specifier) }))
    .filter((item) => item.path)
    .map((item) => ({
      path: item.path,
      reason: `direct import from ${file}`,
      from: file,
      specifier: item.specifier,
    }));
}

function testCandidatesFor(file) {
  if (!file || isTestPath(file) || isGeneratedPath(file) || isMetadataPath(file, { mapsRoot })) return [];
  const ext = path.extname(file);
  if (!/\.(tsx|ts|jsx|js|mjs|cjs|mts|cts)$/.test(file)) return [];

  const dir = path.dirname(file);
  const baseName = path.basename(file, ext);
  const candidates = [];
  const testExts = [".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx", ".test.js", ".test.jsx", ".spec.js", ".spec.jsx"];

  for (const suffix of ["test", "spec"]) {
    candidates.push(normalizePath(path.join(dir, `${baseName}.${suffix}${ext}`)));
    candidates.push(normalizePath(path.join(dir, "__tests__", `${baseName}.${suffix}${ext}`)));
    candidates.push(normalizePath(path.join(dir, "tests", `${baseName}.${suffix}${ext}`)));
  }

  for (const testExt of testExts) {
    candidates.push(normalizePath(path.join(dir, `${baseName}${testExt}`)));
    candidates.push(normalizePath(path.join(dir, "__tests__", `${baseName}${testExt}`)));
  }

  return [...new Set(candidates)].filter(fileExists).map((candidate) => ({ path: candidate, reason: `matching test candidate for ${file}` }));
}

function impactWeight(current, next) {
  const order = { none: 0, maybe: 1, affected: 2, required: 3 };
  return order[next] > order[current] ? next : current;
}

function addMetadataTarget(bucket, pathValue, reason) {
  if (!pathValue) return;
  const normalized = normalizePath(pathValue);
  if (!bucket.has(normalized)) bucket.set(normalized, new Set());
  bucket.get(normalized).add(reason);
}

const { mode, entries: rawEntries } = getDiffEntries();
const entries = uniqueByPath(rawEntries).map((entry) => {
  const classes = classifyPath(entry.path, { mapsRoot });
  return {
    ...entry,
    classes,
    role: roleForPath(entry.path),
    domain: extractDomain(entry.path),
    isMetadata: isMetadataPath(entry.path, { mapsRoot }),
    isGenerated: isGeneratedPath(entry.path),
    isTest: isTestPath(entry.path),
  };
});

const humanChanged = entries.filter((entry) => !entry.isGenerated && !entry.isMetadata && entry.status !== "deleted");
const classSet = new Set(entries.flatMap((entry) => entry.classes));
const hasRoutes = classSet.has("routes");
const hasApi = classSet.has("api");
const hasState = classSet.has("state");
const hasPackages = classSet.has("packages");
const hasTests = classSet.has("test");
const hasSource = entries.some((entry) => entry.classes.some((kind) => !["metadata", "generated", "docs", "test"].includes(kind)));
const domainClasses = [...classSet].filter((kind) => kind.startsWith("domain:"));

const mapImpact = {
  root: "none",
  routes: "none",
  api: "none",
  state: "none",
  packages: "none",
  domains: {},
};

const metadataRequired = new Map();
const metadataMaybe = new Map();
const metadataSkip = new Map();

for (const entry of entries) {
  for (const kind of entry.classes) {
    if (["metadata", "generated", "docs", "test", "source"].includes(kind)) continue;

    if (kind === "routes") {
      const routeEntryChanged = /(^|\/)(routes?|router|appRoutes)\.(tsx|ts|jsx|js|mjs|cjs)$/i.test(entry.path) || entry.status === "renamed" || entry.status === "deleted";
      const level = routeEntryChanged ? "affected" : "maybe";
      mapImpact.routes = impactWeight(mapImpact.routes, level);
      addMetadataTarget(routeEntryChanged ? metadataRequired : metadataMaybe, mapShardForClass(kind, { mapsRoot }), `${entry.path}: ${kind}`);
      addMetadataTarget(metadataMaybe, "AI_INDEX.md", `${entry.path}: route/page changed`);
    }

    if (kind === "api") {
      mapImpact.api = impactWeight(mapImpact.api, "affected");
      addMetadataTarget(metadataRequired, mapShardForClass(kind, { mapsRoot }), `${entry.path}: ${kind}`);
      addMetadataTarget(metadataMaybe, "AI_INDEX.md", `${entry.path}: API/query boundary changed`);
    }

    if (kind === "state") {
      mapImpact.state = impactWeight(mapImpact.state, "affected");
      addMetadataTarget(metadataRequired, mapShardForClass(kind, { mapsRoot }), `${entry.path}: ${kind}`);
      addMetadataTarget(metadataMaybe, "AI_INDEX.md", `${entry.path}: state/cache boundary changed`);
    }

    if (kind === "packages") {
      mapImpact.packages = impactWeight(mapImpact.packages, "affected");
      addMetadataTarget(metadataRequired, mapShardForClass(kind, { mapsRoot }), `${entry.path}: ${kind}`);
      addMetadataTarget(metadataMaybe, "AI_INDEX.md", `${entry.path}: package/build/test config changed`);
    }

    if (kind === "first-read") {
      addMetadataTarget(metadataRequired, "AI_INDEX.md", `${entry.path}: first-read entry changed`);
    }

    if (kind.startsWith("domain:")) {
      const domain = kind.slice("domain:".length);
      mapImpact.domains[domain] = impactWeight(mapImpact.domains[domain] || "none", "affected");
      addMetadataTarget(metadataRequired, mapShardForClass(kind, { mapsRoot }), `${entry.path}: domain boundary`);
      addMetadataTarget(metadataMaybe, "AI_INDEX.md", `${entry.path}: domain ownership may affect router`);
    }
  }
}

addMetadataTarget(metadataSkip, `${mapsRoot}/root.md`, "diff anchors are specific; root map is not a first read");
for (const shard of ["routes", "api", "state", "packages"]) {
  const shardPath = `${mapsRoot}/${shard}.md`;
  if (!metadataRequired.has(shardPath) && !metadataMaybe.has(shardPath)) addMetadataTarget(metadataSkip, shardPath, "no changed file classified for this shard");
}

const couplingSignals = [];
if (hasRoutes && hasApi) couplingSignals.push("route + query/API/cache coupling");
if (hasRoutes && hasState) couplingSignals.push("route + session/state coupling");
if (hasApi && hasTests) couplingSignals.push("API/query behavior tests changed");
if (hasPackages && hasSource) couplingSignals.push("package/config change with source behavior impact");
if (domainClasses.length > 1) couplingSignals.push("multiple domain shards touched");

const directImports = includeImports ? uniqueByPath(humanChanged.flatMap((entry) => extractDirectImports(entry.path))) : [];
const matchingTests = includeTests
  ? uniqueByPath([
      ...entries.filter((entry) => entry.isTest).map((entry) => ({ path: entry.path, reason: "changed test file" })),
      ...humanChanged.flatMap((entry) => testCandidatesFor(entry.path)),
    ])
  : [];

const readNext = uniqueByPath([
  ...humanChanged.map((entry) => ({ path: entry.path, reason: `changed ${entry.role}` })),
  ...directImports,
  ...matchingTests,
]).slice(0, maxReadNext);

const skipped = [
  { path: `${mapsRoot}/root.md`, reason: "changed files give stronger anchors than vague-product routing" },
  { path: `${mapsRoot}/*`, reason: "do not read every shard; use only affected shard candidates" },
  ...entries
    .filter((entry) => entry.isGenerated)
    .map((entry) => ({ path: entry.path, reason: "generated-looking file; inspect human wrapper/mapper unless changed generated boundary is the task" })),
];

function mapToList(mapValue) {
  return [...mapValue.entries()].map(([pathValue, reasons]) => ({ path: pathValue, reasons: [...reasons] }));
}

const impact = {
  maps: mapImpact,
  couplingSignals,
  tests: matchingTests.map((item) => item.path),
  reviewFocus: [
    ...(hasRoutes ? ["visible route/page behavior"] : []),
    ...(hasApi ? ["API/query/client boundary"] : []),
    ...(hasState ? ["state/cache/session behavior"] : []),
    ...(hasPackages ? ["package/build/test verification"] : []),
    ...(domainClasses.length ? [`domain map(s): ${domainClasses.map((kind) => kind.slice("domain:".length)).join(", ")}`] : []),
  ],
};

const result = {
  command: outputMode,
  source: { mode, base, target, mapsRoot, includeImports, includeTests },
  changed: entries,
  impact,
  readNext,
  skip: skipped,
  metadata: {
    required: mapToList(metadataRequired),
    maybe: mapToList(metadataMaybe).filter((item) => !metadataRequired.has(item.path)),
    skip: mapToList(metadataSkip).filter((item) => !metadataRequired.has(item.path) && !metadataMaybe.has(item.path)),
  },
  status: entries.length ? "ok" : "empty-diff",
};

function impactLine(key, value) {
  if (key === "domains") {
    const domains = Object.entries(value).filter(([, level]) => level !== "none");
    if (!domains.length) return "- domain maps: none";
    return `- domain maps: ${domains.map(([domain, level]) => `${domain} ${level}`).join(", ")}`;
  }
  return `- ${key} map: ${value}`;
}

function changedLine(entry) {
  const status = entry.status && entry.status !== "modified" ? `${entry.status}; ` : "";
  const domain = entry.domain ? `; domain: ${entry.domain}` : "";
  const previous = entry.previousPath ? `; from: ${entry.previousPath}` : "";
  return `- \`${entry.path}\`: ${status}${entry.role}; ${entry.classes.join(", ")}${domain}${previous}`;
}

function reasonsInline(item) {
  return item.reasons?.length ? ` — ${item.reasons.slice(0, 2).join("; ")}` : "";
}

function printText() {
  const heading = outputMode === "review" ? "[DIFF_REVIEW]" : outputMode === "fix-plan" ? "[DIFF_FIX_PLAN]" : "[DIFF_IMPACT]";
  console.log(heading);
  console.log(`Source: ${mode}${mode === "base" ? ` (${base})` : ""}`);
  console.log(`Changed files: ${entries.length}`);
  console.log("");
  console.log("Changed:");
  console.log(entries.length ? entries.map(changedLine).join("\n") : "- none detected");
  console.log("");
  console.log("Impact:");
  console.log(impactLine("routes", mapImpact.routes));
  console.log(impactLine("api", mapImpact.api));
  console.log(impactLine("state", mapImpact.state));
  console.log(impactLine("packages", mapImpact.packages));
  console.log(impactLine("domains", mapImpact.domains));
  console.log(`- tests: ${matchingTests.length ? matchingTests.map((item) => item.path).join(", ") : "matching tests only if behavior changed"}`);
  console.log(`- coupling: ${couplingSignals.length ? couplingSignals.join("; ") : "none obvious"}`);
  console.log("");

  if (outputMode === "review") {
    console.log("Review focus:");
    console.log(impact.reviewFocus.length ? impact.reviewFocus.map((item) => `- ${item}`).join("\n") : "- changed files only; no broad behavior boundary detected");
    console.log("- verify imports/types around changed hunks before reading unrelated maps");
    console.log("");
  }

  if (outputMode === "fix-plan") {
    console.log("Minimal fix path:");
    console.log("1. Read exact changed files around changed hunks.");
    console.log("2. Follow direct imports only where changed code crosses a boundary.");
    console.log("3. Patch the smallest source/test set that explains the diff.");
    console.log("4. Update AI metadata only for required/maybe targets below.");
    console.log("");
  }

  console.log("Read next:");
  console.log(readNext.length ? readNext.map((item) => `- \`${item.path}\`: ${item.reason}`).join("\n") : "- exact changed files, if any");
  if (!includeImports) console.log("- direct imports: run with `--include-imports` when changed files are not enough");
  console.log("");
  console.log("Skip:");
  console.log(skipped.map((item) => `- \`${item.path}\`: ${item.reason}`).join("\n"));
  console.log("");
  console.log("AI metadata:");
  console.log(`- required: ${result.metadata.required.length ? result.metadata.required.map((item) => `\`${item.path}\`${reasonsInline(item)}`).join(", ") : "none"}`);
  console.log(`- maybe: ${result.metadata.maybe.length ? result.metadata.maybe.map((item) => `\`${item.path}\`${reasonsInline(item)}`).join(", ") : "none"}`);
  console.log(`- skip: ${result.metadata.skip.length ? result.metadata.skip.map((item) => `\`${item.path}\``).join(", ") : "none"}`);
  console.log("");
  console.log("Verification:");
  console.log("- run targeted tests for changed behavior when available");
  if (hasPackages) console.log("- run package/build/type checks affected by config changes");
  if (hasApi || hasState || hasRoutes) console.log("- run typecheck/lint for touched route/API/state boundary when practical");
  if (!hasPackages && !hasApi && !hasState && !hasRoutes) console.log("- no obvious structural verification beyond changed-file checks");
}

if (jsonOnly) {
  console.log(JSON.stringify(result, null, 2));
} else {
  printText();
  console.log("\n[DIFF_IMPACT_JSON]");
  console.log(JSON.stringify(result, null, 2));
}

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
 * - maps/api.md
 * - maps/state.md
 * - maps/packages.md
 * - maps/domains/*.md
 *
 * This script does not modify source files. Source-level @ai-* headers are disabled by default.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

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
const emitMaps = !hasFlag("--no-maps");
const respectGitignore = hasFlag("--respect-gitignore");
const denySensitivePaths = hasFlag("--deny-sensitive-paths");
const includeGenerated = hasFlag("--include-generated");
const candidateOnly = hasFlag("--candidate-only");
const allowSourceHeaders = hasFlag("--source-headers");
const respectAiIgnore = hasFlag("--respect-ai-ignore");
const maxFilesPerMap = Number(getArg("--max-files-per-map", "80"));
const maxMapTokens = Number(getArg("--max-map-tokens", "1600"));
const maxDomainMaps = Number(getArg("--max-domain-maps", "16"));
const maxTotalFiles = Number(getArg("--max-total-files", "0"));
const maxDepth = Number(getArg("--max-depth", "0"));
const changedSince = getArg("--changed-since", null);
const excludePatterns = getArgs("--exclude")
  .flatMap((value) => value.split(","))
  .map((value) => value.trim())
  .filter(Boolean);

const scanWarnings = [];

const IGNORE_DIRS = new Set([
  ".git",
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
  /(api[_-]?key|token|password|passwd)/i,
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
  /(^|\/).*store.*\.(tsx|ts|jsx|js)$/,
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

function keywordsFor(file, kind = "file") {
  const pieces = new Set([kind]);
  for (const part of file.split(/[\/_.-]+/)) {
    const cleaned = part.trim().toLowerCase();
    if (cleaned && cleaned.length >= 2 && !/^(src|app|index|tsx|jsx|ts|js|md|json)$/.test(cleaned)) pieces.add(cleaned);
  }
  if (/query|mutation/i.test(file)) pieces.add("query");
  if (/routes?|router/i.test(file)) pieces.add("route");
  if (/store|session|cache/i.test(file)) pieces.add("state");
  return [...pieces].slice(0, 8);
}

function roleFor(file, kind = "file") {
  if (/routes?|router|appRoutes/i.test(path.basename(file))) return "route-map";
  if (/(page|screen|view|layout)\.(tsx|ts|jsx|js)$/i.test(file) || /(^|\/)(pages|app|routes)\//.test(file)) return "route-or-page";
  if (/query|mutation/i.test(file)) return "query-or-mutation";
  if (/api|client|openapi|swagger|endpoint/i.test(file)) return "api-boundary";
  if (/store|zustand|redux|atom|jotai|recoil|session|cache/i.test(file)) return "state-boundary";
  if (/provider/i.test(file)) return "provider";
  if (/package\.json|workspace|turbo|nx|vite|next\.config|tsconfig/i.test(file)) return "package-or-config";
  if (/main\.(tsx|ts|jsx|js)$|App\.(tsx|ts|jsx|js)$/i.test(file)) return "app-bootstrap";
  return kind;
}

function toFileHint(file, kind = "file") {
  return {
    path: file,
    role: roleFor(file, kind),
    scope: describeFile(file, kind),
    domain: extractDomain(file),
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

function asFileMap(items, kind, limit = maxFilesPerMap, tokenBudget = maxMapTokens) {
  const rawLines = items.slice(0, limit).map((f) => {
    const hint = toFileHint(f, kind);
    const domain = hint.domain ? `; domain: ${hint.domain}` : "";
    const keywords = hint.keywords.length ? `; keywords: ${hint.keywords.join(", ")}` : "";
    return `- \`${f}\`: role: ${hint.role}; scope: ${hint.scope}${domain}${keywords}; confidence: ${hint.confidence}`;
  });
  const packed = truncateByTokenBudget(rawLines, tokenBudget);
  const lines = packed.lines;
  const remaining = Math.max(0, items.length - lines.length);
  if (remaining) lines.push(`- ... truncated ${remaining} more; estimated_tokens: ${packed.estimatedTokens}; use targeted search or exact path lookup`);
  return lines.join("\n") || "- none detected";
}

function describeFile(file, kind = "file") {
  const base = path.basename(file);
  if (/routes?|router|appRoutes/i.test(base)) return "routing entry or route map";
  if (/(page|screen|view|layout)\.(tsx|ts|jsx|js)$/i.test(base) || /(^|\/)(pages|app|routes)\//.test(file)) return "page or screen area";
  if (/api|client|openapi|swagger|query|mutation/i.test(file)) return "API/query/client candidate";
  if (/store|zustand|redux|atom|jotai|recoil|session/i.test(file)) return "state/cache/session candidate";
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
const scanTruncated = Boolean(maxTotalFiles && allFiles.length >= maxTotalFiles);
if (scanTruncated) scanWarnings.push(`File walk reached --max-total-files ${maxTotalFiles}; output is truncated.`);

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
const entryCandidates = files.filter((f) => matchAny(f, ENTRY_CANDIDATE_PATTERNS)).sort();
const fileHintCandidates = files.filter((f) => matchAny(f, HEADER_CANDIDATE_PATTERNS)).sort();
const sourceHeaderExceptionCandidates = allowSourceHeaders ? fileHintCandidates : [];

const routeCandidates = files
  .filter((f) => /routes?|router|appRoutes/i.test(path.basename(f)) || /(^|\/)(pages|app|routes)\//.test(f))
  .filter((f) => /\.(tsx|ts|jsx|js|md)$/.test(f))
  .sort();

const apiCandidates = files
  .filter((f) => /api|client|openapi|swagger|query|mutation|endpoint/i.test(f))
  .filter((f) => /\.(tsx|ts|jsx|js|json|yaml|yml|md)$/.test(f))
  .sort();

const stateCandidates = files
  .filter((f) => /store|zustand|redux|atom|jotai|recoil|session|cache/i.test(f))
  .filter((f) => /\.(tsx|ts|jsx|js|md)$/.test(f))
  .sort();

const packageCandidates = allFiles
  .filter((f) => /package\.json|pnpm-workspace|turbo\.json|nx\.json|vite\.config|next\.config|tsconfig|eslint|prettier|vitest|jest|playwright/i.test(f))
  .sort();

const pageDirs = files
  .filter((f) => /(^|\/)(pages|app|routes)\//.test(f))
  .map((f) => f.split("/").slice(0, 4).join("/"))
  .filter(Boolean);
const uniquePageDirs = [...new Set(pageDirs)].sort().slice(0, 80);

const domainBuckets = new Map();
for (const file of files) {
  const domain = extractDomain(file);
  if (!domain || domain.length < 2) continue;
  if (!domainBuckets.has(domain)) domainBuckets.set(domain, []);
  domainBuckets.get(domain).push(file);
}

const domainSummaries = [...domainBuckets.entries()]
  .filter(([, items]) => items.length >= 2)
  .map(([domain, items]) => ({ domain, files: items.slice(0, maxFilesPerMap), count: items.length }))
  .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
  .slice(0, maxDomainMaps);

const generatedAt = new Date().toISOString();
const baseMapMeta = {
  confidence: "generated-only",
  lastVerified: null,
  source: "path-heuristic",
};
const maps = [
  {
    id: "root",
    path: ".ai/indexing/maps/root.md",
    scope: ["top-level", "ambiguous", "vague-product"],
    keywords: ["전체", "어디", "기능", "화면", "흐름", "모름", "ambiguous"],
    tokenBudget: 1200,
    ...baseMapMeta,
  },
  {
    id: "routes",
    path: ".ai/indexing/maps/routes.md",
    scope: ["routes", "pages", "screens"],
    keywords: ["route", "router", "page", "screen", "url", "라우트", "페이지", "화면"],
    tokenBudget: 1600,
    ...baseMapMeta,
  },
  {
    id: "api",
    path: ".ai/indexing/maps/api.md",
    scope: ["api", "query", "client", "openapi", "backend"],
    keywords: ["api", "query", "mutation", "endpoint", "backend", "swagger", "openapi"],
    tokenBudget: 1600,
    ...baseMapMeta,
  },
  {
    id: "state",
    path: ".ai/indexing/maps/state.md",
    scope: ["state", "store", "cache", "session"],
    keywords: ["state", "store", "cache", "session", "zustand", "redux", "jotai", "recoil"],
    tokenBudget: 1400,
    ...baseMapMeta,
  },
  {
    id: "packages",
    path: ".ai/indexing/maps/packages.md",
    scope: ["packages", "workspace", "build", "config"],
    keywords: ["package", "workspace", "build", "config", "lint", "test", "설정"],
    tokenBudget: 1400,
    ...baseMapMeta,
  },
  ...domainSummaries.map(({ domain }) => ({
    id: `domain:${domain}`,
    path: `.ai/indexing/maps/domains/${domain}.md`,
    scope: ["domain", domain],
    keywords: [domain],
    tokenBudget: 1400,
    ...baseMapMeta,
  })),
];

const report = {
  target,
  generatedAt,
  packageManager,
  packageName: packageJson?.name ?? null,
  scan: {
    mode: candidateOnly ? "candidate-only" : changedSince ? "changed-since" : "default",
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
  apiCandidates: apiCandidates.slice(0, 160),
  stateCandidates: stateCandidates.slice(0, 160),
  packageCandidates: packageCandidates.slice(0, 160),
  fileHintCandidates: fileHintCandidates.slice(0, 160),
  sourceHeaderExceptionCandidates: sourceHeaderExceptionCandidates.slice(0, 80),
  pageDirs: uniquePageDirs,
  domainSummaries,
  maps,
};

fs.mkdirSync(outDir, { recursive: true });

const scanWarningBlock = scanWarnings.length
  ? scanWarnings.map((warning) => `- ${warning}`).join("\n")
  : "- none";

const aiIndexCandidate = `# AI_INDEX.candidate.md

Generated by \`joo-indexing-scan.mjs\`.

Use this as input for an AI agent. Do not copy blindly.

## Project

- name: ${report.packageName ?? "TODO"}
- package manager: ${report.packageManager}
- top-level dirs: ${report.topLevelDirs.map((d) => `\`${d}\``).join(", ") || "TODO"}

## Scan Metadata

- mode: ${report.scan.mode}
- confidence: generated-only
- files seen: ${report.scan.filesSeen}
- files indexed: ${report.scan.filesIndexed}
- generated-looking files excluded: ${report.scan.generatedFilesExcluded}
- source headers: ${report.scan.allowSourceHeaders ? "explicitly enabled" : "disabled by default"}
- max map tokens: ${report.scan.maxMapTokens}
- truncated: ${report.scan.truncated ? "yes" : "no"}

## Scan Warnings

${scanWarningBlock}

## Existing Navigation Files

${importantFiles
  .filter((f) => /AGENTS\.md|CLAUDE\.md|AI_INDEX\.md/.test(f))
  .map((f) => `- \`${f}\``)
  .join("\n") || "- none detected"}

## Suggested Router

Keep \`AI_INDEX.md\` short. It should route tasks to one shard, then source files/imports.

- route/page/screen work: \`.ai/indexing/maps/routes.md\`
- vague product wording: \`.ai/indexing/maps/root.md\`
- API/backend/query work: \`.ai/indexing/maps/api.md\`
- state/store/cache work: \`.ai/indexing/maps/state.md\`
- package/build/config work: \`.ai/indexing/maps/packages.md\`
- domain work: \`.ai/indexing/maps/domains/<domain>.md\` when present

## Trust Rule

This candidate and all sidecar maps are disposable navigation hints. Source/imports/tests beat generated metadata.

File-level hints live in map shards and \`.ai/indexing/file-map.candidate.json\`, not in source headers by default.

If source contradicts this candidate, report stale metadata instead of forcing the index to fit.

## Map Shards Generated

${maps.map((m) => `- \`${m.path}\`: ${m.scope.join(", ")}; confidence: ${m.confidence}; last_verified: ${m.lastVerified ?? "unknown"}`).join("\n")}

## Workspace / Config Candidates

${asList(workspaceFiles)}

## Entry Candidates

${asList(entryCandidates)}

## Route Candidates

${asList(routeCandidates)}

## API / Query Candidates

${asList(apiCandidates)}

## State Candidates

${asList(stateCandidates)}

## Page / App Area Candidates

${asList(uniquePageDirs)}

## Suggested Next AI Step

Create or update \`AI_INDEX.md\` as a router, then keep detailed maps in \`.ai/indexing/maps/*\`.

Do not full-scan the repo. Do not paste full inventories into \`AI_INDEX.md\`.
`;

const fileMapCandidate = {
  schemaVersion: 1,
  kind: "file-map-candidate",
  generatedAt,
  source: "joo-indexing-scan.mjs",
  policy: {
    sourceHeadersDefault: false,
    sidecarMapsDefault: true,
    metadataIsHintNotTruth: true,
    exactPathLookupBeforeBroadMapRead: true,
    maxMapTokens,
  },
  maps: {
    root: entryCandidates.slice(0, maxFilesPerMap).map((f) => toFileHint(f, "entry")),
    routes: routeCandidates.slice(0, maxFilesPerMap).map((f) => toFileHint(f, "route/page")),
    api: apiCandidates.slice(0, maxFilesPerMap).map((f) => toFileHint(f, "API/query")),
    state: stateCandidates.slice(0, maxFilesPerMap).map((f) => toFileHint(f, "state")),
    packages: packageCandidates.slice(0, maxFilesPerMap).map((f) => toFileHint(f, "package/config")),
    domains: Object.fromEntries(domainSummaries.map(({ domain, files: domainFiles }) => [
      domain,
      domainFiles.slice(0, maxFilesPerMap).map((f) => toFileHint(f, "domain")),
    ])),
  },
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
- Keep map entries compact: path, role, scope, domain, keywords, related, confidence, lastVerified.
- Do not put agent commands inside map entries.

## Candidate Entries

${fileHintCandidates
  .slice(0, 160)
  .map((f) => {
    const hint = toFileHint(f, "file");
    const domain = hint.domain ? `; domain: ${hint.domain}` : "";
    return `- \`${f}\`: role: ${hint.role}; scope: ${hint.scope}${domain}; confidence: ${hint.confidence}`;
  })
  .join("\n") || "- none detected"}
`;

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

writeFile("indexing-report.json", JSON.stringify(report, null, 2));
writeFile("file-map.candidate.json", JSON.stringify(fileMapCandidate, null, 2));
writeFile("AI_INDEX.candidate.md", aiIndexCandidate);
writeFile("file-hints.candidate.md", fileHintsCandidateMd);
writeFile("source-header-exceptions.md", sourceHeaderExceptionsMd);

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
    version: 2,
    generatedAt,
    project: {
      name: report.packageName ?? null,
      packageManager,
    },
    scan: report.scan,
    policy: {
      aiIndexRole: "router-only",
      defaultMapReadLimit: 1,
      companionMapReadLimitWhenCoupled: 1,
      maxMapReadLimitBeforeEdit: 2,
      defaultSourceReadLimitBeforeDecision: 3,
      maxSourceReadLimitBeforeDecision: 5,
      preferImportsAfterFirstSource: true,
      broadSearchOnlyWhenBlocked: true,
      metadataIsHintNotTruth: true,
      sourceHeadersDefault: false,
      sidecarMapsDefault: true,
      exactPathLookupBeforeBroadMapRead: true,
      maxMapTokens,
    },
    maps,
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

If a likely source file is found, follow imports instead of reading more maps.

Use one companion shard only when a coupling signal exists.
`);

  writeFile("maps/routes.md", `${mapHeader("Routes / Pages Map")}
## Scope

Routes, pages, screens, navigation, layouts, route guards.

## First Read

${asFileMap(routeCandidates.slice(0, 20), "route/page", 20)}

## Page / App Area Candidates

${asList(uniquePageDirs)}

## File Map

${asFileMap(routeCandidates, "route/page")}

## Cheap Escalation

- route/page + data issue -> also read \`maps/api.md\`
- route/page + session/permission issue -> also read \`maps/state.md\`

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

  writeFile("maps/api.md", `${mapHeader("API / Query Map")}
## Scope

API clients, query/mutation hooks, OpenAPI/Swagger integration, backend endpoint mapping.

## First Read

${asFileMap(apiCandidates.slice(0, 20), "API/query", 20)}

## File Map

${asFileMap(apiCandidates, "API/query")}

## Read Rule

After finding the API/query entry, follow imports to types, generated clients, or domain services only when needed.

Inspect generated clients only at the exact operation/type boundary.

## Cheap Escalation

- API task + visible page behavior -> also read \`maps/routes.md\`
- API task + session/auth behavior -> also read \`maps/state.md\`

## Do Not Start Here

- generated API outputs unless the task is about generated code
- full backend specs when only one endpoint is relevant

## Staleness Triggers

- API client architecture changed
- query library/provider changed
- endpoint naming or OpenAPI source changed
- generated client path changed
`);

  writeFile("maps/state.md", `${mapHeader("State / Store Map")}
## Scope

Global state, stores, atoms, cache, session state, client-side persistence.

## First Read

${asFileMap(stateCandidates.slice(0, 20), "state", 20)}

## File Map

${asFileMap(stateCandidates, "state")}

## Read Rule

After finding the state entry, follow imports to selectors, actions, persistence, or API calls only when needed.

## Cheap Escalation

- state/session + route guard issue -> also read \`maps/routes.md\`
- cache/query ownership issue -> also read \`maps/api.md\`

## Do Not Start Here

- local component state unless the task names that component
- generated types or snapshots

## Staleness Triggers

- store library changed
- global/session state moved
- cache/query ownership changed
- state entry files renamed
`);

  writeFile("maps/packages.md", `${mapHeader("Packages / Config Map")}
## Scope

Package manager, workspace layout, build/test/lint config, monorepo package boundaries.

## First Read

${asFileMap(packageCandidates.slice(0, 20), "package/config", 20)}

## File Map

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
    const domainRoutes = domainFiles.filter((f) => routeCandidates.includes(f));
    const domainApis = domainFiles.filter((f) => apiCandidates.includes(f));
    const domainState = domainFiles.filter((f) => stateCandidates.includes(f));
    writeFile(`maps/domains/${domain}.md`, `${mapHeader(`Domain Map: ${domain}`)}
## Scope

Domain-like area inferred from paths containing \`${domain}\`.

Detected files: ${count}

## First Read

${asFileMap(domainFiles.slice(0, 20), "domain", 20)}

## Route / Page Candidates

${asFileMap(domainRoutes, "route/page", 40)}

## API Candidates

${asFileMap(domainApis, "API/query", 40)}

## State Candidates

${asFileMap(domainState, "state", 40)}

## File Map

${asFileMap(domainFiles, "domain")}

## Read Rule

Use this shard only when the user request clearly maps to \`${domain}\` or root/routes/api/state maps point here.

After finding a source entry, follow imports instead of reading other domain maps.

Use one companion shard only when a route/API/state coupling signal exists.

## Staleness Triggers

- domain folder renamed or moved
- domain route/API/state ownership changed
- first-read files changed
`);
  }
}

console.log(`Wrote indexing candidates to ${outDir}`);
console.log(`- AI_INDEX.candidate.md`);
console.log(`- file-map.candidate.json`);
console.log(`- file-hints.candidate.md`);
console.log(`- source-header-exceptions.md`);
console.log(`- indexing-report.json`);
if (emitMaps) {
  console.log(`- manifest.json`);
  console.log(`- maps/root.md`);
  console.log(`- maps/routes.md`);
  console.log(`- maps/api.md`);
  console.log(`- maps/state.md`);
  console.log(`- maps/packages.md`);
  if (domainSummaries.length) console.log(`- maps/domains/*.md (${domainSummaries.length})`);
}
if (scanWarnings.length) {
  console.log(`Warnings:`);
  for (const warning of scanWarnings) console.log(`- ${warning}`);
}

#!/usr/bin/env node

/**
 * Validate AI navigation metadata cheaply before spending agent tokens.
 *
 * No external dependencies.
 * Checks:
 * - AI_INDEX exists and stays router-sized
 * - referenced map shards exist
 * - map shards stay compact
 * - referenced source paths still exist
 * - generated/sensitive-looking paths appear in metadata
 * - optional source-level @ai-* headers do not appear when disabled
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

function getArg(name, fallback) {
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

const target = path.resolve(getArg("--target", "."));
const indexPath = path.resolve(target, getArg("--index", "AI_INDEX.md"));
const mapsDir = path.resolve(target, getArg("--maps", path.join(".ai", "indexing", "maps")));
const fileMapPath = path.resolve(target, getArg("--file-map", path.join(".ai", "indexing", "file-map.candidate.json")));
const warnOnly = hasFlag("--warn-only");
const maxAiIndexLines = Number(getArg("--max-ai-index-lines", "160"));
const maxMapLines = Number(getArg("--max-map-lines", "260"));
const sourceHeaders = hasFlag("--source-headers");

const GENERATED_PATH_PATTERNS = [
  /(^|\/)__generated__(\/|$)/i,
  /(^|\/)generated(\/|$)/i,
  /(^|\/)gen(\/|$)/i,
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

const report = {
  target,
  index: path.relative(target, indexPath).replaceAll(path.sep, "/"),
  mapsDir: path.relative(target, mapsDir).replaceAll(path.sep, "/"),
  fileMap: path.relative(target, fileMapPath).replaceAll(path.sep, "/"),
  healthy: [],
  stale: [],
  missing: [],
  warnings: [],
  generatedLike: [],
  sensitiveLike: [],
  sourceHeadersFound: [],
};

function rel(absOrRel) {
  return path.relative(target, path.resolve(target, absOrRel)).replaceAll(path.sep, "/");
}

function existsRel(file) {
  return fs.existsSync(path.resolve(target, file));
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function lineCount(text) {
  return text.split(/\r?\n/).length;
}

function isGeneratedPath(file) {
  return GENERATED_PATH_PATTERNS.some((p) => p.test(file));
}

function isSensitivePath(file) {
  return SENSITIVE_PATH_PATTERNS.some((p) => p.test(file));
}

function extractBacktickPaths(text) {
  const paths = new Set();
  const regex = /`([^`\n]+)`/g;
  let match;
  while ((match = regex.exec(text))) {
    const value = match[1].trim();
    if (!value || value.includes("<") || value.includes(">")) continue;
    if (/^(https?:|git@|npm |node |pnpm |yarn )/.test(value)) continue;
    if (value.includes("*")) continue;
    if (!/[/.]/.test(value)) continue;
    if (!value.includes("/") && !/^(package\.json|pnpm-workspace\.yaml|turbo\.json|nx\.json|tsconfig\.json|AI_INDEX\.md|AGENTS\.md|CLAUDE\.md)$/.test(value)) continue;
    if (/\s/.test(value)) continue;
    if (/^(true|false|null|unknown)$/.test(value)) continue;
    paths.add(value.replace(/^\//, ""));
  }
  return [...paths];
}


function extractJsonPaths(text) {
  const paths = new Set();
  const looksLikePath = (v) => {
    if (!v || /\s/.test(v)) return false;
    if (!/[/.]/.test(v)) return false;
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return false;
    if (/^(https?:|git@|npm|node|pnpm|yarn)$/.test(v)) return false;
    if (/^(generated-only|manual-reviewed|low|medium|high|unknown|null|true|false)$/.test(v)) return false;
    if (/^(route\/page|API\/query|package\/config)$/.test(v)) return false;
    return true;
  };
  try {
    const parsed = JSON.parse(text);
    const visit = (value, key = "") => {
      if (Array.isArray(value)) return value.forEach((item) => visit(item, key));
      if (value && typeof value === "object") {
        return Object.entries(value).forEach(([childKey, childValue]) => visit(childValue, childKey));
      }
      if (typeof value !== "string") return;
      const v = value.trim().replace(/^\//, "");
      if (!["path", "related", "file", "files", "map", "maps"].includes(key)) return;
      if (looksLikePath(v)) paths.add(v);
    };
    visit(parsed);
  } catch {
    return [];
  }
  return [...paths];
}

function walkSourceFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if ([".git", "node_modules", "dist", "build", ".next", "coverage", ".ai"].includes(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSourceFiles(abs, acc);
    else if (/\.(tsx|ts|jsx|js|mjs|cjs|vue|svelte)$/.test(entry.name)) acc.push(abs);
  }
  return acc;
}

function walkMapFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMapFiles(abs, acc);
    } else if (/\.(md|json)$/.test(entry.name)) {
      acc.push(abs);
    }
  }
  return acc;
}

if (!fs.existsSync(indexPath)) {
  report.missing.push(`${report.index} is missing`);
} else {
  const text = read(indexPath);
  const lines = lineCount(text);
  if (lines > maxAiIndexLines) {
    report.warnings.push(`${report.index} has ${lines} lines; router may be too large`);
  } else {
    report.healthy.push(`${report.index} is router-sized (${lines} lines)`);
  }

  const mapRefs = extractBacktickPaths(text).filter((p) => p.startsWith(".ai/indexing/maps/"));
  for (const mapRef of mapRefs) {
    if (!existsRel(mapRef)) report.missing.push(`Referenced map shard missing: ${mapRef}`);
  }
  if (mapRefs.length) report.healthy.push(`Checked ${mapRefs.length} map shard reference(s) from ${report.index}`);
}


if (fs.existsSync(fileMapPath)) {
  const text = read(fileMapPath);
  const fileMapRel = rel(fileMapPath);
  report.healthy.push(`Found sidecar file map: ${fileMapRel}`);
  const refs = extractJsonPaths(text)
    .filter((p) => !p.startsWith(".ai/indexing/maps/"))
    .filter((p) => !p.startsWith("maps/"))
    .filter((p) => !p.endsWith("/"));
  for (const ref of refs) {
    if (isGeneratedPath(ref)) report.generatedLike.push(`${fileMapRel} -> ${ref}`);
    if (isSensitivePath(ref)) report.sensitiveLike.push(`${fileMapRel} -> ${ref}`);
    if (!existsRel(ref)) report.stale.push(`${fileMapRel} references missing path: ${ref}`);
  }
}

if (!fs.existsSync(mapsDir)) {
  report.warnings.push(`${report.mapsDir} is missing; skip map validation`);
} else {
  const mapFiles = walkMapFiles(mapsDir).sort();
  report.healthy.push(`Found ${mapFiles.length} map shard file(s)`);

  for (const file of mapFiles) {
    const text = read(file);
    const mapRel = rel(file);
    const lines = lineCount(text);
    if (lines > maxMapLines) report.warnings.push(`${mapRel} has ${lines} lines; shard may be too large`);

    const refs = [...new Set([...extractBacktickPaths(text), ...extractJsonPaths(text)])]
      .filter((p) => !p.startsWith(".ai/indexing/maps/"))
      .filter((p) => !p.startsWith("maps/"))
      .filter((p) => !p.endsWith("/"));

    for (const ref of refs) {
      if (isGeneratedPath(ref)) report.generatedLike.push(`${mapRel} -> ${ref}`);
      if (isSensitivePath(ref)) report.sensitiveLike.push(`${mapRel} -> ${ref}`);
      if (!existsRel(ref)) report.stale.push(`${mapRel} references missing path: ${ref}`);
    }
  }
}


if (!sourceHeaders) {
  const sourceFiles = walkSourceFiles(target);
  for (const file of sourceFiles) {
    let sample = "";
    try {
      sample = fs.readFileSync(file, "utf8").slice(0, 2000);
    } catch {
      continue;
    }
    if (/@ai-(purpose|domain|keywords|entry|depends|used-by|notes)\b/.test(sample)) {
      report.sourceHeadersFound.push(rel(file));
    }
  }
  if (report.sourceHeadersFound.length) {
    report.warnings.push(`Source-level @ai-* headers found (${report.sourceHeadersFound.length}) while source headers are disabled by default.`);
  }
}

if (report.generatedLike.length) {
  report.warnings.push(`Generated-looking paths appear in metadata (${report.generatedLike.length}). Prefer indexing human-owned boundaries.`);
}
if (report.sensitiveLike.length) {
  report.warnings.push(`Sensitive-looking paths appear in metadata (${report.sensitiveLike.length}). Review before sharing with external AI tools.`);
}

const hasFailure = report.missing.length > 0 || report.stale.length > 0;

console.log("[INDEX_VALIDATION]");
for (const item of report.healthy) console.log(`Healthy: ${item}`);
for (const item of report.warnings) console.log(`Warning: ${item}`);
for (const item of report.missing) console.log(`Missing: ${item}`);
for (const item of report.stale.slice(0, 50)) console.log(`Stale: ${item}`);
if (report.stale.length > 50) console.log(`Stale: ... truncated ${report.stale.length - 50} more`);
for (const item of report.sourceHeadersFound.slice(0, 50)) console.log(`SourceHeader: ${item}`);
if (report.sourceHeadersFound.length > 50) console.log(`SourceHeader: ... truncated ${report.sourceHeadersFound.length - 50} more`);

console.log("\n[INDEX_VALIDATION_JSON]");
console.log(JSON.stringify(report, null, 2));

if (hasFailure && !warnOnly) {
  process.exitCode = 1;
}

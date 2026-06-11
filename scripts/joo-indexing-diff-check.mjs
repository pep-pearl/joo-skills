#!/usr/bin/env node

/**
 * Check whether source changes likely require AI navigation metadata updates.
 *
 * No external dependencies.
 * Designed for PR/CI guardrails. Start with --warn-only, then make strict later.
 *
 * Examples:
 *   node scripts/joo-indexing-diff-check.mjs --base main --warn-only
 *   node scripts/joo-indexing-diff-check.mjs --changed-files src/pages/a.tsx,src/api/client.ts
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

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
const warnOnly = hasFlag("--warn-only");
const jsonOnly = hasFlag("--json");
const changedFilesArg = getArg("--changed-files", "");
const mapsRoot = getArg("--maps", path.join(".ai", "indexing", "maps"));

function normalize(file) {
  return String(file || "").trim().replace(/^\.\//, "").replaceAll(path.sep, "/");
}

function runGit(args) {
  return execFileSync("git", args, { cwd: target, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function getChangedFiles() {
  if (changedFilesArg) {
    return changedFilesArg
      .split(/[\n,]+/)
      .map(normalize)
      .filter(Boolean);
  }

  const candidates = [
    ["diff", "--name-only", `${base}...HEAD`],
    ["diff", "--name-only", base],
    ["diff", "--name-only", "HEAD"],
  ];

  for (const command of candidates) {
    try {
      const output = runGit(command);
      if (output) return output.split(/\r?\n/).map(normalize).filter(Boolean);
    } catch {
      // try next strategy
    }
  }

  return [];
}

function isMetadata(file) {
  return (
    file === "AI_INDEX.md" ||
    file === "AGENTS.md" ||
    file.startsWith(`${mapsRoot.replaceAll(path.sep, "/")}/`) ||
    file === path.join(".ai", "indexing", "manifest.json").replaceAll(path.sep, "/") ||
    file === path.join(".ai", "indexing", "file-map.candidate.json").replaceAll(path.sep, "/") ||
    file.startsWith("rules/") ||
    file.startsWith(".cursor/rules/") ||
    file.startsWith(".claude/")
  );
}

function classify(file) {
  const f = file.toLowerCase();
  const classes = [];
  if (isMetadata(file)) classes.push("metadata");
  if (/(^|\/)(pages|app|routes)\/|(^|\/)(routes?|router|appRoutes)\.(tsx|ts|jsx|js|mjs|cjs)$|\.(page|layout)\.(tsx|ts|jsx|js)$/i.test(file)) classes.push("routes");
  if (/(api|client|openapi|swagger|endpoint|query|mutation)/i.test(file)) classes.push("api");
  if (/(store|state|session|cache|atom|redux|zustand|jotai|recoil)/i.test(file)) classes.push("state");
  if (/(^|\/)package\.json$|workspace|turbo\.json|nx\.json|vite\.config|next\.config|tsconfig|eslint|prettier/i.test(file)) classes.push("packages");
  if (/(^|\/)(features|entities|domains|modules)\/([^/]+)/i.test(file)) classes.push(`domain:${RegExp.$2}`);
  if (/(^|\/)(main|app|App|providers?)\.(tsx|ts|jsx|js|mjs|cjs)$/i.test(file)) classes.push("first-read");
  if (/(^|\/)(__generated__|generated|gen)(\/|$)|\.generated\.|\.gen\./i.test(file)) classes.push("generated");
  if (/\.(md|mdx|txt)$/i.test(file) && !isMetadata(file)) classes.push("docs");
  if (!classes.length) classes.push("source");
  return [...new Set(classes)];
}

function expectedMetadataForClass(kind) {
  const map = {
    routes: ["AI_INDEX.md", `${mapsRoot}/routes.md`],
    api: ["AI_INDEX.md", `${mapsRoot}/api.md`],
    state: ["AI_INDEX.md", `${mapsRoot}/state.md`],
    packages: ["AI_INDEX.md", `${mapsRoot}/packages.md`],
    "first-read": ["AI_INDEX.md"],
  };
  if (kind.startsWith("domain:")) return ["AI_INDEX.md", `${mapsRoot}/domains/${kind.slice("domain:".length)}.md`];
  return map[kind] || [];
}

const changedFiles = [...new Set(getChangedFiles())];
const changedMetadata = changedFiles.filter(isMetadata);
const changedSource = changedFiles.filter((file) => !isMetadata(file));
const classified = changedSource.map((file) => ({ file, classes: classify(file) }));

const expected = new Map();
for (const item of classified) {
  for (const kind of item.classes) {
    if (["metadata", "generated", "docs", "source"].includes(kind)) continue;
    for (const metadataPath of expectedMetadataForClass(kind)) {
      const key = metadataPath.replaceAll(path.sep, "/");
      if (!expected.has(key)) expected.set(key, []);
      expected.get(key).push({ file: item.file, reason: kind });
    }
  }
}

function metadataTouched(metadataPath) {
  if (changedMetadata.includes(metadataPath)) return true;
  if (metadataPath.startsWith(`${mapsRoot}/domains/`)) {
    return changedMetadata.some((file) => file.startsWith(`${mapsRoot}/domains/`));
  }
  return false;
}

const warnings = [];
const healthy = [];
for (const [metadataPath, causes] of expected) {
  if (metadataTouched(metadataPath)) {
    healthy.push(`${metadataPath} touched for ${causes.length} relevant change(s)`);
    continue;
  }
  const exists = fs.existsSync(path.resolve(target, metadataPath));
  const reasonSummary = [...new Set(causes.map((cause) => cause.reason))].join(", ");
  warnings.push({
    metadataPath,
    exists,
    reasons: [...new Set(causes.map((cause) => cause.reason))],
    sourceFiles: causes.map((cause) => cause.file).slice(0, 20),
    message: `${metadataPath} may need update because ${reasonSummary} file(s) changed`,
  });
}

const result = {
  base,
  target,
  changedFiles,
  changedMetadata,
  classified,
  expectedMetadata: [...expected.entries()].map(([metadataPath, causes]) => ({ metadataPath, causes })),
  healthy,
  warnings,
  status: warnings.length ? (warnOnly ? "warning" : "failed") : "ok",
};

if (jsonOnly) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("[AI_METADATA_DIFF_CHECK]");
  console.log(`Base: ${base}`);
  console.log(`Changed files: ${changedFiles.length}`);
  for (const item of classified) console.log(`Changed: ${item.file} | ${item.classes.join(", ")}`);
  for (const item of healthy) console.log(`Healthy: ${item}`);
  for (const warning of warnings) {
    console.log(`Warning: ${warning.message}`);
    console.log(`  source: ${warning.sourceFiles.join(", ")}`);
    if (!warning.exists) console.log("  note: metadata file does not exist yet");
  }
  if (!warnings.length) console.log("OK: no obvious AI navigation metadata update needed.");
  console.log("\n[AI_METADATA_DIFF_CHECK_JSON]");
  console.log(JSON.stringify(result, null, 2));
}

if (warnings.length && !warnOnly) process.exitCode = 1;

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
import {
  classifyPath,
  expectedMetadataForClass,
  isMetadataPath,
  normalizeMapsRoot,
  normalizePath,
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
const warnOnly = hasFlag("--warn-only");
const jsonOnly = hasFlag("--json");
const changedFilesArg = getArg("--changed-files", "");
const mapsRoot = normalizeMapsRoot(getArg("--maps", path.join(".ai", "indexing", "maps")));

function runGit(commandArgs) {
  return execFileSync("git", commandArgs, { cwd: target, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

function getChangedFiles() {
  if (changedFilesArg) {
    return changedFilesArg
      .split(/[\n,]+/)
      .map(normalizePath)
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
      if (output) return output.split(/\r?\n/).map(normalizePath).filter(Boolean);
    } catch {
      // try next strategy
    }
  }

  return [];
}

const changedFiles = [...new Set(getChangedFiles())];
const changedMetadata = changedFiles.filter((file) => isMetadataPath(file, { mapsRoot }));
const changedSource = changedFiles.filter((file) => !isMetadataPath(file, { mapsRoot }));
const classified = changedSource.map((file) => ({ file, classes: classifyPath(file, { mapsRoot }) }));

const expected = new Map();
for (const item of classified) {
  for (const kind of item.classes) {
    if (["metadata", "generated", "docs", "test", "source"].includes(kind)) continue;
    for (const metadataPath of expectedMetadataForClass(kind, { mapsRoot })) {
      const key = normalizePath(metadataPath);
      if (!expected.has(key)) expected.set(key, []);
      expected.get(key).push({ file: item.file, reason: kind });
    }
  }
}

function metadataTouched(metadataPath) {
  const normalized = normalizePath(metadataPath);
  if (changedMetadata.includes(normalized)) return true;
  if (normalized.startsWith(`${mapsRoot}/domains/`)) {
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
    sourceFiles: [...new Set(causes.map((cause) => cause.file))].slice(0, 20),
    message: `${metadataPath} may need update because ${reasonSummary} file(s) changed`,
  });
}

const result = {
  base,
  target,
  mapsRoot,
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

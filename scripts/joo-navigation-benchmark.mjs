#!/usr/bin/env node

/**
 * Lightweight benchmark for AI navigation metadata.
 *
 * This does not call an LLM. It measures whether current metadata can surface expected
 * entry files for representative prompts using the lookup index. When cases include
 * baseline/optimized read or token metrics, it also reports estimated token savings.
 *
 * Case file default: .ai/indexing/benchmarks/navigation-cases.json
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
const casesPath = path.resolve(target, getArg("--cases", path.join(".ai", "indexing", "benchmarks", "navigation-cases.json")));
const lookupScript = path.resolve(target, getArg("--lookup-script", path.join("scripts", "joo-indexing-lookup.mjs")));
const mapsArg = getArg("--maps", null);
const fileMapArg = getArg("--file-map", null);
const jsonOnly = hasFlag("--json");
const topN = Number(getArg("--top-n", "5"));

function normalize(file) {
  return String(file || "").trim().replace(/^\.\//, "").replaceAll(path.sep, "/");
}


function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function readMetric(source, names) {
  if (!source || typeof source !== "object") return null;
  for (const name of names) {
    if (source[name] !== undefined) return numberOrNull(source[name]);
  }
  return null;
}

function savingsMetrics(testCase) {
  const baseline = testCase.baseline || {};
  const optimized = testCase.optimized || testCase.joo || {};
  const baselineTokens = readMetric(baseline, ["estimatedTokens", "tokens", "estTokens"]);
  const optimizedTokens = readMetric(optimized, ["estimatedTokens", "tokens", "estTokens"]);
  const baselineFiles = readMetric(baseline, ["filesRead", "readFiles", "fileCount"]);
  const optimizedFiles = readMetric(optimized, ["filesRead", "readFiles", "fileCount"]);
  const tokenSavings = baselineTokens !== null && optimizedTokens !== null ? baselineTokens - optimizedTokens : null;
  const tokenSavingsPct = tokenSavings !== null && baselineTokens > 0 ? Math.round((tokenSavings / baselineTokens) * 100) : null;
  const fileSavings = baselineFiles !== null && optimizedFiles !== null ? baselineFiles - optimizedFiles : null;
  const fileSavingsPct = fileSavings !== null && baselineFiles > 0 ? Math.round((fileSavings / baselineFiles) * 100) : null;

  return {
    baselineTokens,
    optimizedTokens,
    tokenSavings,
    tokenSavingsPct,
    baselineFiles,
    optimizedFiles,
    fileSavings,
    fileSavingsPct,
  };
}

function loadCases() {
  if (!fs.existsSync(casesPath)) {
    return {
      cases: [],
      missing: true,
      message: `Benchmark cases file missing: ${path.relative(target, casesPath)}`,
    };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(casesPath, "utf8"));
    const cases = Array.isArray(parsed) ? parsed : parsed.cases || [];
    return { cases, missing: false, message: null };
  } catch (error) {
    return { cases: [], missing: false, message: `Invalid benchmark cases JSON: ${error.message}` };
  }
}

function runLookup(testCase) {
  const command = [lookupScript, "--target", target, "--limit", String(Math.max(topN, 10)), "--json"];
  if (mapsArg) command.push("--maps", mapsArg);
  if (fileMapArg) command.push("--file-map", fileMapArg);
  const query = testCase.query || {};
  const keywordValues = [
    ...(Array.isArray(query.keywords) ? query.keywords : []),
    ...(Array.isArray(testCase.keywords) ? testCase.keywords : []),
  ];
  if (query.path || testCase.path) command.push("--path", normalize(query.path || testCase.path));
  if (query.intent || testCase.intent) command.push("--intent", String(query.intent || testCase.intent));
  if (query.domain || testCase.domain) command.push("--domain", String(query.domain || testCase.domain));
  for (const keyword of keywordValues) command.push("--keyword", String(keyword));
  if (!keywordValues.length && testCase.prompt) command.push("--keyword", String(testCase.prompt));

  const output = execFileSync("node", command, { cwd: target, encoding: "utf8" });
  return JSON.parse(output);
}

function scoreCase(testCase, lookup) {
  const expected = (testCase.expectedEntryFiles || []).map(normalize);
  const forbidden = (testCase.forbiddenStarts || []).map(normalize);
  const matches = (lookup.matches || []).map((item) => normalize(item.path));
  const top = matches.slice(0, topN);
  const expectedHits = expected.filter((file) => top.includes(file));
  const allExpectedHits = expected.filter((file) => matches.includes(file));
  const firstHitIndexes = expected
    .map((file) => matches.indexOf(file))
    .filter((index) => index >= 0)
    .map((index) => index + 1);
  const firstHitAt = firstHitIndexes.length ? Math.min(...firstHitIndexes) : null;
  const forbiddenHit = matches.find((file) => forbidden.some((bad) => file === bad || file.startsWith(`${bad}/`))) || null;

  let score = 0;
  if (!expected.length) score += 40;
  else score += Math.round((expectedHits.length / expected.length) * 60);
  if (firstHitAt === 1) score += 25;
  else if (firstHitAt && firstHitAt <= topN) score += 15;
  else if (firstHitAt) score += 8;
  if (!forbiddenHit) score += 15;
  score = Math.max(0, Math.min(100, score));

  return {
    id: testCase.id || testCase.prompt || "unnamed-case",
    prompt: testCase.prompt || null,
    score,
    firstHitAt,
    expected,
    topMatches: top,
    expectedHits,
    allExpectedHits,
    forbiddenHit,
    savings: savingsMetrics(testCase),
    status: score >= 80 ? "pass" : score >= 60 ? "warn" : "fail",
  };
}

const loaded = loadCases();
const results = [];
const errors = [];

for (const testCase of loaded.cases) {
  try {
    const lookup = runLookup(testCase);
    results.push(scoreCase(testCase, lookup));
  } catch (error) {
    errors.push({ id: testCase.id || testCase.prompt || "unnamed-case", message: error.message });
  }
}

const averageScore = results.length ? Math.round(results.reduce((sum, item) => sum + item.score, 0) / results.length) : 0;
const savingsResults = results.filter((item) => item.savings.tokenSavingsPct !== null || item.savings.fileSavingsPct !== null);
const tokenSavingsResults = results.filter((item) => item.savings.tokenSavingsPct !== null);
const fileSavingsResults = results.filter((item) => item.savings.fileSavingsPct !== null);
const averageTokenSavingsPct = tokenSavingsResults.length
  ? Math.round(tokenSavingsResults.reduce((sum, item) => sum + item.savings.tokenSavingsPct, 0) / tokenSavingsResults.length)
  : null;
const averageFileSavingsPct = fileSavingsResults.length
  ? Math.round(fileSavingsResults.reduce((sum, item) => sum + item.savings.fileSavingsPct, 0) / fileSavingsResults.length)
  : null;
const result = {
  target,
  casesPath: path.relative(target, casesPath).replaceAll(path.sep, "/"),
  topN,
  maps: mapsArg,
  fileMap: fileMapArg,
  averageScore,
  counts: {
    total: loaded.cases.length,
    pass: results.filter((item) => item.status === "pass").length,
    warn: results.filter((item) => item.status === "warn").length,
    fail: results.filter((item) => item.status === "fail").length,
    error: errors.length,
    withSavingsMetrics: savingsResults.length,
  },
  averageTokenSavingsPct,
  averageFileSavingsPct,
  results,
  errors,
  missingCasesFile: loaded.missing || false,
  message: loaded.message,
};

if (jsonOnly) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("[AI_NAVIGATION_BENCHMARK]");
  if (result.message) console.log(`Note: ${result.message}`);
  console.log(`Cases: ${result.counts.total}, average_score=${averageScore}`);
  for (const item of results) {
    console.log(`${item.status.toUpperCase()}: ${item.id} | score=${item.score} | first_hit_at=${item.firstHitAt ?? "none"}`);
    console.log(`  top: ${item.topMatches.join(", ") || "none"}`);
    if (item.savings.tokenSavingsPct !== null) {
      console.log(`  token_savings: ${item.savings.tokenSavingsPct}% (${item.savings.baselineTokens} -> ${item.savings.optimizedTokens})`);
    }
    if (item.savings.fileSavingsPct !== null) {
      console.log(`  file_savings: ${item.savings.fileSavingsPct}% (${item.savings.baselineFiles} -> ${item.savings.optimizedFiles})`);
    }
    if (item.forbiddenHit) console.log(`  forbidden_hit: ${item.forbiddenHit}`);
  }
  for (const error of errors) console.log(`ERROR: ${error.id} | ${error.message}`);
  console.log("\n[AI_NAVIGATION_BENCHMARK_JSON]");
  console.log(JSON.stringify(result, null, 2));
}

if (errors.length || results.some((item) => item.status === "fail")) process.exitCode = 1;

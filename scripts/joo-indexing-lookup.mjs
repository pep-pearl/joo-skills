#!/usr/bin/env node

/**
 * Lookup compact AI navigation metadata without reading whole map shards.
 *
 * No external dependencies.
 * Reads sidecar file hints and map shards, then returns the smallest likely next-read files.
 *
 * Examples:
 *   node scripts/joo-indexing-lookup.mjs --path src/pages/orders/detail.tsx
 *   node scripts/joo-indexing-lookup.mjs --keyword "주문 상세" --limit 5
 *   node scripts/joo-indexing-lookup.mjs --intent route-page --domain order --json
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

function getArg(name, fallback = null) {
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
const mapsDir = path.resolve(target, getArg("--maps", path.join(".ai", "indexing", "maps")));
const fileMapPath = path.resolve(target, getArg("--file-map", path.join(".ai", "indexing", "file-map.candidate.json")));
const exactPath = normalizePath(getArg("--path", ""));
const intent = (getArg("--intent", "") || "").trim().toLowerCase();
const domain = (getArg("--domain", "") || "").trim().toLowerCase();
const keywords = [
  ...getArgs("--keyword"),
  ...(getArg("--query", "") ? [getArg("--query", "")] : []),
]
  .flatMap((value) => String(value).split(/[\s,]+/))
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
const limit = Number(getArg("--limit", "10"));
const jsonOnly = hasFlag("--json");

if (!exactPath && !intent && !domain && !keywords.length) {
  console.error("Usage: joo-indexing-lookup --path <file> | --keyword <text> | --intent <intent> [--domain <domain>] [--json]");
  process.exit(2);
}

function normalizePath(value) {
  return String(value || "")
    .trim()
    .replace(/^`|`$/g, "")
    .replace(/^\.\//, "")
    .replaceAll(path.sep, "/");
}

function rel(abs) {
  return path.relative(target, abs).replaceAll(path.sep, "/");
}

function existsRel(file) {
  return fs.existsSync(path.resolve(target, file));
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, acc);
    else if (/\.(md|json)$/i.test(entry.name)) acc.push(abs);
  }
  return acc;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value.files)) return value.files;
  if (Array.isArray(value.hints)) return value.hints;
  if (Array.isArray(value.entries)) return value.entries;
  return Object.values(value).flatMap((item) => (Array.isArray(item) ? item : []));
}

function cleanWords(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}_/-]+/u)
    .map((word) => word.trim())
    .filter(Boolean);
}

function inferIntentFromPath(file) {
  if (/(^|\/)(pages|app|routes)\//i.test(file) || /(page|screen|view|layout|route|router|routes)\./i.test(file)) return "route-page";
  if (/(api|client|openapi|swagger|query|mutation|endpoint)/i.test(file)) return "api";
  if (/(store|state|session|cache|atom|redux|zustand|jotai|recoil)/i.test(file)) return "state";
  if (/(package\.json|workspace|turbo|nx|vite|next\.config|tsconfig|eslint|prettier)/i.test(file)) return "config";
  return "domain";
}

function mapIntentToRoles(value) {
  const key = String(value || "").toLowerCase();
  const table = {
    "route-page": ["route", "page", "screen", "layout", "route-or-page", "route-map"],
    api: ["api", "client", "query", "mutation", "endpoint", "api-boundary", "query-or-mutation"],
    state: ["state", "store", "session", "cache", "state-boundary"],
    config: ["config", "package", "workspace", "build", "package-or-config"],
    domain: ["domain", "feature", "entity", "service"],
    "vague-product": ["root", "route", "page", "domain"],
  };
  return table[key] || [key].filter(Boolean);
}

function recordText(record) {
  return [
    record.path,
    record.role,
    record.scope,
    record.domain,
    ...(record.keywords || []),
    ...(record.related || []),
    record.rawLine,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scoreRecord(record) {
  let score = 0;
  const text = recordText(record);
  const file = record.path.toLowerCase();

  if (exactPath) {
    const exact = exactPath.toLowerCase();
    if (file === exact) score += 1000;
    else if (file.endsWith(`/${exact}`)) score += 800;
    else if (file.includes(exact)) score += 500;
  }

  if (domain) {
    if (String(record.domain || "").toLowerCase() === domain) score += 160;
    if (file.includes(`/${domain}/`) || file.includes(`-${domain}`) || file.includes(`${domain}-`)) score += 90;
    if (text.includes(domain)) score += 60;
  }

  if (intent) {
    const roles = mapIntentToRoles(intent);
    const roleText = `${record.role || ""} ${inferIntentFromPath(record.path)}`.toLowerCase();
    if (roles.some((role) => roleText.includes(role))) score += 140;
    if (roles.some((role) => text.includes(role))) score += 50;
  }

  for (const keyword of keywords) {
    if (!keyword) continue;
    if (file.includes(keyword)) score += 80;
    if (text.includes(keyword)) score += 50;
  }

  if (record.confidence && /manual-reviewed|high/i.test(record.confidence)) score += 20;
  if (record.source === "file-map") score += 12;
  if (existsRel(record.path)) score += 8;
  else score -= 40;
  if (/(^|\/)(__generated__|generated|gen)(\/|$)|\.generated\.|\.gen\./i.test(record.path)) score -= 35;
  if (/\.(test|spec|stories)\.(tsx|ts|jsx|js|mdx)$/i.test(record.path)) score -= 15;

  return score;
}

function loadFileMapRecords() {
  if (!fs.existsSync(fileMapPath)) return [];
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(fileMapPath, "utf8"));
  } catch (error) {
    return [{ path: rel(fileMapPath), role: "invalid-json", scope: error.message, source: "file-map", confidence: "low" }];
  }
  return asArray(parsed)
    .filter((entry) => entry && typeof entry === "object" && entry.path)
    .map((entry) => ({
      path: normalizePath(entry.path),
      role: entry.role || inferIntentFromPath(entry.path),
      scope: entry.scope || entry.purpose || "",
      domain: entry.domain || "",
      keywords: Array.isArray(entry.keywords) ? entry.keywords : cleanWords(entry.keywords),
      related: Array.isArray(entry.related) ? entry.related.map(normalizePath) : [],
      confidence: entry.confidence || "unknown",
      lastVerified: entry.lastVerified || entry.last_verified || null,
      source: "file-map",
      sourcePath: rel(fileMapPath),
    }));
}

function parseMdLine(line, sourcePath) {
  const match = line.match(/`([^`\n]+)`/);
  if (!match) return null;
  const file = normalizePath(match[1]);
  if (!file || file.startsWith("http") || file.includes("*")) return null;
  if (file.startsWith(".ai/indexing/maps/") || file.startsWith("maps/")) return null;
  if (!/[/.]/.test(file)) return null;
  const role = (line.match(/role:\s*([^;]+)/i) || [])[1]?.trim() || inferIntentFromPath(file);
  const scope = (line.match(/scope:\s*([^;]+)/i) || [])[1]?.trim() || line.replace(/`[^`]+`/g, "").replace(/^[-*]\s*/, "").replace(/^:\s*/, "").trim();
  const foundDomain = (line.match(/domain:\s*([^;]+)/i) || [])[1]?.trim() || "";
  const keywordText = (line.match(/keywords?:\s*([^;]+)/i) || [])[1] || "";
  const confidence = (line.match(/confidence:\s*([^;]+)/i) || [])[1]?.trim() || "unknown";
  return {
    path: file,
    role,
    scope,
    domain: foundDomain,
    keywords: cleanWords(keywordText),
    related: [],
    confidence,
    source: "map-shard",
    sourcePath,
    rawLine: line.trim(),
  };
}

function loadMapRecords() {
  return walk(mapsDir).flatMap((file) => {
    const sourcePath = rel(file);
    let text = "";
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      return [];
    }
    return text
      .split(/\r?\n/)
      .map((line) => parseMdLine(line, sourcePath))
      .filter(Boolean);
  });
}

function dedupe(records) {
  const best = new Map();
  for (const record of records) {
    if (!record.path) continue;
    const key = record.path;
    const previous = best.get(key);
    if (!previous || scoreRecord(record) > scoreRecord(previous)) best.set(key, record);
  }
  return [...best.values()];
}

const records = dedupe([...loadFileMapRecords(), ...loadMapRecords()]);
const scored = records
  .map((record) => ({ ...record, exists: existsRel(record.path), score: scoreRecord(record) }))
  .filter((record) => record.score > 0 || (exactPath && record.path.toLowerCase() === exactPath.toLowerCase()))
  .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
  .slice(0, Math.max(1, limit));

const result = {
  query: {
    path: exactPath || null,
    intent: intent || null,
    domain: domain || null,
    keywords,
  },
  target,
  searched: {
    fileMap: fs.existsSync(fileMapPath) ? rel(fileMapPath) : null,
    mapsDir: fs.existsSync(mapsDir) ? rel(mapsDir) : null,
    records: records.length,
  },
  matches: scored,
  suggestedNextRead: scored.filter((item) => item.exists).slice(0, 5).map((item) => item.path),
  skipped: scored.length ? [] : ["No metadata match. Use smallest targeted source search."],
};

if (jsonOnly) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("[AI_INDEX_LOOKUP]");
  console.log(`Query: ${JSON.stringify(result.query)}`);
  console.log(`Records searched: ${records.length}`);
  if (!scored.length) {
    console.log("No metadata match. Use targeted search instead of reading all maps.");
  } else {
    for (const match of scored) {
      console.log(`Match: ${match.path} | score=${match.score} | source=${match.sourcePath} | exists=${match.exists}`);
      if (match.scope) console.log(`  scope: ${match.scope}`);
      if (match.related?.length) console.log(`  related: ${match.related.join(", ")}`);
    }
  }
  console.log("\n[AI_INDEX_LOOKUP_JSON]");
  console.log(JSON.stringify(result, null, 2));
}

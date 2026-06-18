#!/usr/bin/env node

/**
 * Lookup compact AI navigation metadata without reading whole map shards.
 *
 * No external dependencies.
 * Reads sidecar file hints and map shards, then returns the smallest likely next-read files.
 * Ranking is task-aware: concrete behavior owners beat generic routes, and suggested reads
 * are selected to cover distinct unresolved task concerns instead of taking a raw top-N.
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

function normalizePath(value) {
  return String(value || "")
    .trim()
    .replace(/^`|`$/g, "")
    .replace(/^\.\//, "")
    .replaceAll(path.sep, "/");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/["'`“”‘’]/g, " ")
    .replace(/[^\p{L}\p{N}_/.-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "with", "from", "current", "code", "file", "files",
  "현재", "코드", "파일", "찾아줘", "찾기", "수정", "하려고", "한다", "에서", "으로", "가", "이", "을", "를", "의"
]);

function stripKoreanParticle(word) {
  return word.replace(/(에서|으로|에게|부터|까지|처럼|보다|은|는|이|가|을|를|의|에|도|만|와|과|일)$/u, "");
}

function cleanWords(value) {
  return normalizeText(value)
    .split(/[\s/.-]+/u)
    .map((word) => stripKoreanParticle(word.trim()))
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function listValue(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value || "").split(/\s*,\s*/).map((item) => item.trim()).filter(Boolean);
}

const target = path.resolve(getArg("--target", "."));
const mapsDir = path.resolve(target, getArg("--maps", path.join(".ai", "indexing", "maps")));
const fileMapPath = path.resolve(target, getArg("--file-map", path.join(".ai", "indexing", "file-map.candidate.json")));
const exactPathArg = normalizePath(getArg("--path", ""));
const intent = normalizeText(getArg("--intent", ""));
const domain = normalizeText(getArg("--domain", ""));
const rawQueryValues = unique([
  ...getArgs("--keyword"),
  ...(getArg("--query", "") ? [getArg("--query", "")] : [])
].map(String));
const rawQueryPhrases = rawQueryValues.map((value) => normalizeText(value));
const detectedPath = rawQueryValues.join(" ").match(/(?:[\p{L}\p{N}_@.-]+\/)+[\p{L}\p{N}_@.-]+\.(?:tsx?|jsx?|mjs|cjs|json|md|ya?ml)/u)?.[0] || "";
const exactPath = exactPathArg || normalizePath(detectedPath);
const queryTokens = unique(rawQueryPhrases.flatMap(cleanWords));
const limit = Math.max(1, Number(getArg("--limit", "10")));
const jsonOnly = hasFlag("--json");

if (!exactPath && !intent && !domain && !rawQueryPhrases.length) {
  console.error("Usage: joo-indexing-lookup --path <file> | --keyword <text> | --intent <intent> [--domain <domain>] [--json]");
  process.exit(2);
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

function flattenEntries(value, acc = []) {
  if (Array.isArray(value)) {
    for (const item of value) flattenEntries(item, acc);
    return acc;
  }
  if (!value || typeof value !== "object") return acc;
  if (value.path) {
    acc.push(value);
    return acc;
  }
  for (const child of Object.values(value)) flattenEntries(child, acc);
  return acc;
}

function hasStateSignal(file) {
  const expanded = String(file).replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  return /(^|[\/_.-])(store|state|session|cache|atom|redux|zustand|jotai|recoil|url-state|filter)([\/_.-]|$)/.test(expanded);
}

function inferIntentFromPath(file) {
  if (/(^|\/)(pages|app|routes)\//i.test(file) || /(page|screen|view|layout|route|router|routes)\./i.test(file)) return "route-page";
  if (/(api|client|openapi|swagger|query|mutation|endpoint)/i.test(file)) return "api";
  if (hasStateSignal(file)) return "state";
  if (/(package\.json|workspace|turbo|nx|vite|next\.config|tsconfig|eslint|prettier)/i.test(file)) return "config";
  if (/(badge|field|button|card|formatter|format|label|mapper|toggle)/i.test(file)) return "behavior";
  return "domain";
}

function mapIntentToRoles(value) {
  const table = {
    "route-page": ["route-entry", "surface-entry", "route", "page", "screen", "layout", "route-or-page", "route-map"],
    api: ["data-boundary", "api", "client", "query", "mutation", "endpoint", "api-boundary", "query-or-mutation"],
    state: ["state-boundary", "state", "store", "session", "cache", "url-state"],
    config: ["config", "package", "workspace", "build", "package-or-config"],
    behavior: ["behavior-owner", "behavior-candidate", "component", "mapper", "formatter"],
    domain: ["domain", "feature", "entity", "service"],
    "vague-product": ["root", "surface-entry", "route", "page", "domain"]
  };
  return table[value] || [value].filter(Boolean);
}

function inferQueryConcerns() {
  if (exactPath) return ["exact-file"];
  const text = normalizeText([intent, domain, ...rawQueryPhrases].join(" "));
  const concerns = [];

  if (intent === "route-page" || /(route|router|routing|navigation|라우트|경로|내비게이션)/u.test(text)) concerns.push("route");
  if (/(화면과|페이지와|화면의 진입|페이지 진입|screen and|page and|screen entry|page entry|layout shell)/u.test(text)) concerns.push("surface");
  const hasUrlQuery = /(url state|url query|query string|쿼리스트링|url 상태)/u.test(text);
  if (intent === "api" || /(api|endpoint|mutation|client|swagger|openapi|backend|server request|서버|요청|응답)/u.test(text) || (!hasUrlQuery && /(^|\s)query(\s|$)/u.test(text))) concerns.push("data");
  if (intent === "state" || /(cache|store|state management|session|invalidate|invalidation|url state|url query|filter|reset|캐시|세션|필터|초기화|무효화|상태 관리|상태 동기화)/u.test(text)) concerns.push("state");
  if (intent === "config" || /(config|package|workspace|build|lint|tsconfig|프로젝트 설정|빌드 설정)/u.test(text)) concerns.push("config");
  if (/(label|badge|render|format|formatter|mapping|mapper|button|toggle|validation|status|field|form|input|라벨|배지|렌더|포맷|매핑|버튼|토글|검증|상태값|입력란|입력 필드|폼)/u.test(text)) concerns.push("behavior");

  if (!concerns.length) concerns.push(intent || "domain");
  return unique(concerns);
}

const requiredConcerns = inferQueryConcerns();
const queryText = normalizeText([intent, domain, ...rawQueryPhrases].join(" "));
const hasConcreteBehaviorAnchor = /[A-Z][A-Z0-9_]{2,}/.test(getArgs("--keyword").join(" "))
  || /["'`“”‘’][^"'`“”‘’]{2,}["'`“”‘’]/.test(getArgs("--keyword").join(" "))
  || requiredConcerns.includes("behavior");

function concernsForRecord(record) {
  const explicit = unique([
    ...listValue(record.concern),
    ...listValue(record.concerns)
  ].map(normalizeText));
  if (explicit.length) return explicit;

  const role = normalizeText(record.role);
  const inferred = inferIntentFromPath(record.path);
  const concerns = [];
  if (/behavior-owner|behavior-candidate|formatter|mapper|component/.test(role) || inferred === "behavior") concerns.push("behavior");
  if (/surface-entry|page|screen|layout/.test(role)) concerns.push("surface");
  if (/route-entry|route-map|router/.test(role)) concerns.push("route");
  if (/state-boundary|store|state|cache|session|url-state/.test(role) || inferred === "state") concerns.push("state");
  if (/data-boundary|api-boundary|query|mutation|client|endpoint/.test(role) || inferred === "api") concerns.push("data");
  if (/package|config|workspace|build/.test(role) || inferred === "config") concerns.push("config");
  if (!concerns.length) concerns.push("domain");
  return unique(concerns);
}

function recordText(record) {
  return normalizeText([
    record.path,
    record.role,
    record.scope,
    record.domain,
    ...listValue(record.concern),
    ...listValue(record.concerns),
    ...listValue(record.anchors),
    ...listValue(record.keywords),
    ...listValue(record.related),
    record.rawLine
  ].filter(Boolean).join(" "));
}


function matchedQueryTokensForRecord(record) {
  const text = recordText(record);
  const file = record.path.toLowerCase();
  return queryTokens.filter((token) => file.includes(token) || text.includes(token));
}

function roleScore(record) {
  const role = normalizeText(record.role);
  const concerns = concernsForRecord(record);
  let score = 0;

  if (requiredConcerns.includes("behavior") && concerns.includes("behavior")) score += /behavior-owner/.test(role) ? 190 : 130;
  if (requiredConcerns.includes("surface") && concerns.includes("surface")) score += 150;
  if (requiredConcerns.includes("route") && concerns.includes("route")) score += 150;
  if (requiredConcerns.includes("state") && concerns.includes("state")) score += 160;
  if (requiredConcerns.includes("data") && concerns.includes("data")) score += 160;
  if (requiredConcerns.includes("config") && concerns.includes("config")) score += 150;

  if (!requiredConcerns.includes("route") && concerns.includes("route")) score -= 90;
  if (hasConcreteBehaviorAnchor && /behavior-owner/.test(role)) score += 80;
  return Math.min(score, 220);
}

function scoreRecord(record) {
  let score = 0;
  const text = recordText(record);
  const file = record.path.toLowerCase();
  const anchors = normalizeText(listValue(record.anchors).join(" "));

  if (exactPath) {
    const exact = exactPath.toLowerCase();
    if (file === exact) score += 1000;
    else if (file.endsWith(`/${exact}`)) score += 800;
    else if (file.includes(exact)) score += 500;
  }

  if (domain) {
    if (normalizeText(record.domain) === domain) score += 170;
    if (file.includes(`/${domain}/`) || file.includes(`-${domain}`) || file.includes(`${domain}-`)) score += 90;
    if (text.includes(domain)) score += 60;
  }

  if (intent) {
    const roles = mapIntentToRoles(intent);
    const roleText = `${record.role || ""} ${inferIntentFromPath(record.path)}`.toLowerCase();
    if (roles.some((role) => roleText.includes(role))) score += 140;
    if (roles.some((role) => text.includes(role))) score += 50;
  }

  for (const phrase of rawQueryPhrases) {
    if (!phrase) continue;
    if (anchors.includes(phrase)) score += 260;
    else if (text.includes(phrase)) score += 180;
  }

  let matchedTokens = 0;
  for (const token of queryTokens) {
    let matched = false;
    if (file.includes(token)) {
      score += 85;
      matched = true;
    }
    if (anchors.includes(token)) {
      score += 75;
      matched = true;
    } else if (text.includes(token)) {
      score += 45;
      matched = true;
    }
    if (matched) matchedTokens += 1;
  }
  if (queryTokens.length && matchedTokens === queryTokens.length) score += 100;
  else if (queryTokens.length) score += Math.round((matchedTokens / queryTokens.length) * 60);
  if (rawQueryPhrases.length && matchedTokens === 0 && !exactPath && !intent && !domain) score -= 400;

  score += roleScore(record);
  if (record.confidence && /manual-reviewed|high/i.test(record.confidence)) score += 30;
  if (record.source === "file-map") score += 12;
  if (existsRel(record.path)) score += 8;
  else score -= 200;
  if (/(^|\/)(__generated__|generated|gen)(\/|$)|\.generated\.|\.gen\./i.test(record.path)) score -= 80;
  if (/(^|\/)(legacy|archive|examples|playground)(\/|$)/i.test(record.path)) score -= 160;
  if (/\.(test|spec|stories)\.(tsx|ts|jsx|js|mdx)$/i.test(record.path)) score -= 25;

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
  return flattenEntries(parsed)
    .filter((entry) => entry && typeof entry === "object" && entry.path)
    .map((entry) => ({
      path: normalizePath(entry.path),
      role: entry.role || inferIntentFromPath(entry.path),
      concern: entry.concern || null,
      concerns: listValue(entry.concerns),
      scope: entry.scope || entry.purpose || "",
      domain: entry.domain || "",
      anchors: listValue(entry.anchors),
      keywords: listValue(entry.keywords),
      related: listValue(entry.related).map(normalizePath),
      confidence: entry.confidence || "unknown",
      lastVerified: entry.lastVerified || entry.last_verified || null,
      source: "file-map",
      sourcePath: rel(fileMapPath)
    }));
}

function parseField(line, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = line.match(new RegExp(`(?:^|;)\\s*${escaped}:\\s*([^;]+)`, "i"));
  return match?.[1]?.trim() || "";
}

function parseMdLine(line, sourcePath) {
  const match = line.match(/`([^`\n]+)`/);
  if (!match) return null;
  const file = normalizePath(match[1]);
  if (!file || file.startsWith("http") || file.includes("*")) return null;
  if (file.startsWith(".ai/indexing/maps/") || file.startsWith("maps/")) return null;
  if (!/[/.]/.test(file)) return null;

  const prefixRole = (line.match(/^\s*[-*]\s*([^:;`]+):\s*`/) || [])[1]?.trim() || "";
  const role = parseField(line, "role") || prefixRole || inferIntentFromPath(file);
  const scope = parseField(line, "scope") || line.replace(/`[^`]+`/g, "").replace(/^[-*]\s*/, "").replace(/^:\s*/, "").trim();
  return {
    path: file,
    role,
    concern: parseField(line, "concern") || null,
    concerns: listValue(parseField(line, "concerns")),
    scope,
    domain: parseField(line, "domain"),
    anchors: listValue(parseField(line, "anchors")),
    keywords: listValue(parseField(line, "keywords") || parseField(line, "keyword")),
    related: listValue(parseField(line, "related")).map(normalizePath),
    confidence: parseField(line, "confidence") || "unknown",
    source: "map-shard",
    sourcePath,
    rawLine: line.trim()
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
    return text.split(/\r?\n/).map((line) => parseMdLine(line, sourcePath)).filter(Boolean);
  });
}

function dedupe(records) {
  const best = new Map();
  for (const record of records) {
    if (!record.path) continue;
    const previous = best.get(record.path);
    if (!previous || scoreRecord(record) > scoreRecord(previous)) best.set(record.path, record);
  }
  return [...best.values()];
}

function selectByConcern(matches, maxItems = 5) {
  const selected = [];
  const uncovered = new Set(requiredConcerns);
  const candidates = matches.filter((item) => item.exists);

  for (const concern of requiredConcerns) {
    if (!uncovered.has(concern) || selected.length >= maxItems) continue;
    const next = candidates
      .filter((item) => !selected.includes(item) && item.concerns.includes(concern))
      .sort((a, b) => b.score - a.score)[0];
    if (!next) continue;
    selected.push(next);
    for (const covered of next.concerns) uncovered.delete(covered);
  }

  if (!selected.length && candidates.length) selected.push(candidates[0]);

  // Add an explicitly related file only when it covers query tokens not already
  // represented by the selected set. This captures same-category couplings such
  // as session termination + cart reset without pulling generic parent pages.
  const coveredTokens = new Set(selected.flatMap(matchedQueryTokensForRecord));
  let expanded = true;
  while (expanded && selected.length < maxItems) {
    expanded = false;
    for (const owner of [...selected]) {
      for (const relatedPath of owner.related ?? []) {
        const related = candidates.find((item) => item.path === relatedPath);
        if (!related || selected.includes(related)) continue;
        if (!related.concerns.some((concern) => requiredConcerns.includes(concern))) continue;
        const newTokens = matchedQueryTokensForRecord(related).filter((token) => !coveredTokens.has(token));
        if (!newTokens.length) continue;
        selected.push(related);
        for (const token of matchedQueryTokensForRecord(related)) coveredTokens.add(token);
        expanded = true;
        if (selected.length >= maxItems) break;
      }
      if (selected.length >= maxItems) break;
    }
  }

  return {
    selected,
    uncovered: [...uncovered]
  };
}

const exactRecord = exactPath && existsRel(exactPath)
  ? [{
      path: exactPath,
      role: "exact-file",
      concern: "exact-file",
      concerns: ["exact-file"],
      scope: "exact user-provided path",
      domain: "",
      anchors: [exactPath],
      keywords: [],
      related: [],
      confidence: "exact",
      source: "exact-path",
      sourcePath: null
    }]
  : [];
const records = dedupe([...exactRecord, ...loadFileMapRecords(), ...loadMapRecords()]);
const scored = records
  .map((record) => ({
    ...record,
    concerns: concernsForRecord(record),
    exists: existsRel(record.path),
    score: scoreRecord(record)
  }))
  .filter((record) => record.score > 0 || (exactPath && record.path.toLowerCase() === exactPath.toLowerCase()))
  .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
  .slice(0, Math.max(limit, 20));

const selection = selectByConcern(scored, Math.min(5, limit));
const result = {
  query: {
    path: exactPath || null,
    intent: intent || null,
    domain: domain || null,
    phrases: rawQueryPhrases,
    tokens: queryTokens,
    requiredConcerns
  },
  target,
  searched: {
    fileMap: fs.existsSync(fileMapPath) ? rel(fileMapPath) : null,
    mapsDir: fs.existsSync(mapsDir) ? rel(mapsDir) : null,
    records: records.length
  },
  matches: scored.slice(0, limit),
  suggestedNextRead: selection.selected.map((item) => item.path),
  uncoveredConcerns: selection.uncovered,
  skipped: scored.length ? [] : ["No metadata match. Use smallest targeted source search."]
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
    for (const match of result.matches) {
      console.log(`Match: ${match.path} | score=${match.score} | concerns=${match.concerns.join(",")} | source=${match.sourcePath} | exists=${match.exists}`);
      if (match.scope) console.log(`  scope: ${match.scope}`);
      if (match.related?.length) console.log(`  related: ${match.related.join(", ")}`);
    }
  }
  console.log(`Suggested next read: ${result.suggestedNextRead.join(", ") || "none"}`);
  if (result.uncoveredConcerns.length) console.log(`Uncovered concerns: ${result.uncoveredConcerns.join(", ")}`);
  console.log("\n[AI_INDEX_LOOKUP_JSON]");
  console.log(JSON.stringify(result, null, 2));
}

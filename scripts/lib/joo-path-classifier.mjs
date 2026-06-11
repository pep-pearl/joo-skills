import path from "node:path";

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

const TEST_PATH_PATTERNS = [
  /(^|\/)__tests__(\/|$)/i,
  /(^|\/)(test|tests)(\/|$)/i,
  /(^|\/)test-setup\.(tsx|ts|jsx|js|mjs|cjs)$/i,
  /(^|\/)setupTests\.(tsx|ts|jsx|js|mjs|cjs)$/i,
  /\.(test|spec)\.(tsx|ts|jsx|js|mjs|cjs)$/i,
];

const TEXT_SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".json",
  ".md",
  ".mdx",
  ".yaml",
  ".yml",
]);

export function normalizePath(file) {
  return String(file || "")
    .trim()
    .replace(/^\.\//, "")
    .replaceAll(path.sep, "/");
}

export function normalizeMapsRoot(mapsRoot = path.join(".ai", "indexing", "maps")) {
  return normalizePath(mapsRoot).replace(/\/$/, "");
}

export function isMetadataPath(file, options = {}) {
  const normalized = normalizePath(file);
  const mapsRoot = normalizeMapsRoot(options.mapsRoot);

  return (
    normalized === "AI_INDEX.md" ||
    normalized === "AGENTS.md" ||
    normalized.startsWith(`${mapsRoot}/`) ||
    normalized === normalizePath(path.join(".ai", "indexing", "manifest.json")) ||
    normalized === normalizePath(path.join(".ai", "indexing", "file-map.candidate.json")) ||
    normalized.startsWith("rules/") ||
    normalized.startsWith(".cursor/rules/") ||
    normalized.startsWith(".claude/")
  );
}

export function isGeneratedPath(file) {
  const normalized = normalizePath(file);
  return GENERATED_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isTestPath(file) {
  const normalized = normalizePath(file);
  return TEST_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isDocsPath(file) {
  const normalized = normalizePath(file);
  return /\.(md|mdx|txt)$/i.test(normalized) && !isMetadataPath(normalized);
}

export function isTextLikePath(file) {
  return TEXT_SOURCE_EXTENSIONS.has(path.extname(normalizePath(file)).toLowerCase());
}

export function cleanDomain(value) {
  return String(value || "")
    .replace(/\.(tsx|ts|jsx|js|mjs|cjs|json|md|mdx)$/i, "")
    .replace(/^\[|\]$/g, "")
    .toLowerCase();
}

export function extractDomain(file) {
  const parts = normalizePath(file).split("/");
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

export function roleForPath(file, fallback = "file") {
  const normalized = normalizePath(file);
  const base = path.basename(normalized);

  if (/routes?|router|appRoutes/i.test(base)) return "route-map";
  if (/(page|screen|view|layout)\.(tsx|ts|jsx|js|mjs|cjs)$/i.test(normalized) || /(^|\/)(pages|app|routes)\//.test(normalized)) return "route-or-page";
  if (/query|mutation/i.test(normalized) || /(^|\/)use[A-Z][^/]*(query|mutation|list|detail|fetch|load|search|get)[^/]*\.(tsx|ts|jsx|js|mjs|cjs)$/i.test(normalized)) return "query-or-mutation";
  if (/(^|\/)use[A-Z][^/]*\.(tsx|ts|jsx|js|mjs|cjs)$/i.test(normalized)) return "hook";
  if (/api|client|openapi|swagger|endpoint/i.test(normalized)) return "api-boundary";
  if (/store|zustand|redux|atom|jotai|recoil|session|cache/i.test(normalized)) return "state-boundary";
  if (/provider/i.test(normalized)) return "provider";
  if (/package\.json|workspace|turbo|nx|vite|next\.config|tsconfig|eslint|prettier|vitest|jest|playwright/i.test(normalized)) return "package-or-config";
  if (/main\.(tsx|ts|jsx|js|mjs|cjs)$|App\.(tsx|ts|jsx|js|mjs|cjs)$/i.test(normalized)) return "app-bootstrap";
  if (isTestPath(normalized)) return "test";
  if (isGeneratedPath(normalized)) return "generated";

  return fallback;
}

export function classifyPath(file, options = {}) {
  const normalized = normalizePath(file);
  const classes = [];

  if (isMetadataPath(normalized, options)) classes.push("metadata");
  if (/(^|\/)(pages|app|routes)\/|(^|\/)(routes?|router|appRoutes)\.(tsx|ts|jsx|js|mjs|cjs)$|\.(page|layout)\.(tsx|ts|jsx|js|mjs|cjs)$/i.test(normalized)) classes.push("routes");
  if (/(api|client|openapi|swagger|endpoint|query|mutation)/i.test(normalized) || /(^|\/)use[A-Z][^/]*(query|mutation|list|detail|fetch|load|search|get)[^/]*\.(tsx|ts|jsx|js|mjs|cjs)$/i.test(normalized)) classes.push("api");
  if (/(store|state|session|cache|atom|redux|zustand|jotai|recoil)/i.test(normalized)) classes.push("state");
  if (/(^|\/)package\.json$|workspace|turbo\.json|nx\.json|vite\.config|next\.config|tsconfig|eslint|prettier|vitest|jest|playwright/i.test(normalized)) classes.push("packages");

  const domain = extractDomain(normalized);
  if (/(^|\/)(features|entities|domains|modules)\/([^/]+)/i.test(normalized) && domain) classes.push(`domain:${domain}`);

  if (/(^|\/)(main|app|App|providers?)\.(tsx|ts|jsx|js|mjs|cjs)$/i.test(normalized)) classes.push("first-read");
  if (isGeneratedPath(normalized)) classes.push("generated");
  if (isTestPath(normalized)) classes.push("test");
  if (isDocsPath(normalized)) classes.push("docs");

  if (!classes.length) classes.push("source");
  return [...new Set(classes)];
}

export function expectedMetadataForClass(kind, options = {}) {
  const mapsRoot = normalizeMapsRoot(options.mapsRoot);
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

export function mapShardForClass(kind, options = {}) {
  const mapsRoot = normalizeMapsRoot(options.mapsRoot);
  if (kind === "routes") return `${mapsRoot}/routes.md`;
  if (kind === "api") return `${mapsRoot}/api.md`;
  if (kind === "state") return `${mapsRoot}/state.md`;
  if (kind === "packages") return `${mapsRoot}/packages.md`;
  if (kind.startsWith("domain:")) return `${mapsRoot}/domains/${kind.slice("domain:".length)}.md`;
  return null;
}

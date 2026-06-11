#!/usr/bin/env node

/**
 * Lightweight repo indexing scanner.
 *
 * No external dependencies.
 * Produces candidate files for AI review:
 * - AI_INDEX.candidate.md
 * - header-candidates.md
 * - indexing-report.json
 * - manifest.json
 * - maps/root.md
 * - maps/routes.md
 * - maps/api.md
 * - maps/state.md
 * - maps/packages.md
 * - maps/domains/*.md
 *
 * This script does not modify source files.
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
const outDir = path.resolve(getArg("--out", path.join(target, ".ai", "indexing")));
const emitMaps = !hasFlag("--no-maps");
const maxFilesPerMap = Number(getArg("--max-files-per-map", "80"));
const maxDomainMaps = Number(getArg("--max-domain-maps", "16"));

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

function walk(dir, acc = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }

  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(target, abs).replaceAll(path.sep, "/");

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) walk(abs, acc);
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

function asList(items, limit = maxFilesPerMap) {
  const shown = items.slice(0, limit);
  const lines = shown.map((f) => `- \`${f}\``);
  if (items.length > limit) lines.push(`- ... truncated ${items.length - limit} more; use targeted search`);
  return lines.join("\n") || "- none detected";
}

function asFileMap(items, kind, limit = maxFilesPerMap) {
  const shown = items.slice(0, limit);
  const lines = shown.map((f) => `- \`${f}\`: ${describeFile(f, kind)}`);
  if (items.length > limit) lines.push(`- ... truncated ${items.length - limit} more; use targeted search`);
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

const files = walk(target).sort();

const packageJson = readJson("package.json");
const packageManager = exists("pnpm-lock.yaml") || exists("pnpm-workspace.yaml")
  ? "pnpm"
  : exists("yarn.lock")
    ? "yarn"
    : exists("package-lock.json")
      ? "npm"
      : packageJson?.packageManager ?? "unknown";

const workspaceFiles = files.filter((f) =>
  ["pnpm-workspace.yaml", "turbo.json", "nx.json", "package.json"].includes(f) || /(^|\/)package\.json$/.test(f)
);

const topLevelDirs = fs
  .readdirSync(target, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !IGNORE_DIRS.has(d.name))
  .map((d) => d.name)
  .sort();

const importantFiles = files.filter((f) => matchAny(f, IMPORTANT_FILE_PATTERNS)).sort();
const entryCandidates = files.filter((f) => matchAny(f, ENTRY_CANDIDATE_PATTERNS)).sort();
const headerCandidates = files.filter((f) => matchAny(f, HEADER_CANDIDATE_PATTERNS)).sort();

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

const packageCandidates = files
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
const maps = [
  {
    id: "root",
    path: ".ai/indexing/maps/root.md",
    scope: ["top-level", "ambiguous", "vague-product"],
    keywords: ["전체", "어디", "기능", "화면", "흐름", "모름", "ambiguous"],
    tokenBudget: 1200,
  },
  {
    id: "routes",
    path: ".ai/indexing/maps/routes.md",
    scope: ["routes", "pages", "screens"],
    keywords: ["route", "router", "page", "screen", "url", "라우트", "페이지", "화면"],
    tokenBudget: 1600,
  },
  {
    id: "api",
    path: ".ai/indexing/maps/api.md",
    scope: ["api", "query", "client", "openapi", "backend"],
    keywords: ["api", "query", "mutation", "endpoint", "backend", "swagger", "openapi"],
    tokenBudget: 1600,
  },
  {
    id: "state",
    path: ".ai/indexing/maps/state.md",
    scope: ["state", "store", "cache", "session"],
    keywords: ["state", "store", "cache", "session", "zustand", "redux", "jotai", "recoil"],
    tokenBudget: 1400,
  },
  {
    id: "packages",
    path: ".ai/indexing/maps/packages.md",
    scope: ["packages", "workspace", "build", "config"],
    keywords: ["package", "workspace", "build", "config", "lint", "test", "설정"],
    tokenBudget: 1400,
  },
  ...domainSummaries.map(({ domain }) => ({
    id: `domain:${domain}`,
    path: `.ai/indexing/maps/domains/${domain}.md`,
    scope: ["domain", domain],
    keywords: [domain],
    tokenBudget: 1400,
  })),
];

const report = {
  target,
  generatedAt,
  packageManager,
  packageName: packageJson?.name ?? null,
  topLevelDirs,
  workspaceFiles,
  importantFiles,
  entryCandidates,
  routeCandidates: routeCandidates.slice(0, 160),
  apiCandidates: apiCandidates.slice(0, 160),
  stateCandidates: stateCandidates.slice(0, 160),
  packageCandidates: packageCandidates.slice(0, 160),
  headerCandidates: headerCandidates.slice(0, 160),
  pageDirs: uniquePageDirs,
  domainSummaries,
  maps,
};

fs.mkdirSync(outDir, { recursive: true });

const aiIndexCandidate = `# AI_INDEX.candidate.md

Generated by \`joo-indexing-scan.mjs\`.

Use this as input for an AI agent. Do not copy blindly.

## Project

- name: ${report.packageName ?? "TODO"}
- package manager: ${report.packageManager}
- top-level dirs: ${report.topLevelDirs.map((d) => `\`${d}\``).join(", ") || "TODO"}

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

## Map Shards Generated

${maps.map((m) => `- \`${m.path}\`: ${m.scope.join(", ")}`).join("\n")}

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

const headerCandidateMd = `# Header Candidates

Generated by \`joo-indexing-scan.mjs\`.

Review manually or with AI. Do not add headers to every file.

## Candidates

${headerCandidates
  .slice(0, 160)
  .map((f) => `- \`${f}\`: likely navigation-relevant`)
  .join("\n") || "- none detected"}

## Minimal Header Format

\`\`\`ts
/**
 * @ai-purpose Short responsibility.
 * @ai-domain routing | api | state | page | feature | entity | shared | config | test
 * @ai-keywords Searchable names and user-facing aliases.
 */
\`\`\`

Extended fields such as \`@ai-entry\`, \`@ai-depends\`, \`@ai-used-by\`, and \`@ai-notes\` are optional for high-value entry files only.
`;

writeFile("indexing-report.json", JSON.stringify(report, null, 2));
writeFile("AI_INDEX.candidate.md", aiIndexCandidate);
writeFile("header-candidates.md", headerCandidateMd);

if (emitMaps) {
  const manifest = {
    version: 1,
    generatedAt,
    project: {
      name: report.packageName ?? null,
      packageManager,
    },
    policy: {
      aiIndexRole: "router-only",
      defaultMapReadLimit: 1,
      defaultSourceReadLimitBeforeDecision: 3,
      preferImportsAfterFirstSource: true,
      broadSearchOnlyWhenBlocked: true,
    },
    maps,
  };

  writeFile("manifest.json", JSON.stringify(manifest, null, 2));

  writeFile("maps/root.md", `# Root Map

Generated by \`joo-indexing-scan.mjs\`.

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

${maps.map((m) => `- \`${m.path}\`: ${m.scope.join(", ")}`).join("\n")}

## Entry Candidates

${asFileMap(entryCandidates, "entry")}

## Read Rule

Read one likely shard next. Do not read all shards.

If a likely source file is found, follow imports instead of reading more maps.
`);

  writeFile("maps/routes.md", `# Routes / Pages Map

Generated by \`joo-indexing-scan.mjs\`.

## Scope

Routes, pages, screens, navigation, layouts, route guards.

## First Read

${asFileMap(routeCandidates.slice(0, 20), "route/page", 20)}

## Page / App Area Candidates

${asList(uniquePageDirs)}

## File Map

${asFileMap(routeCandidates, "route/page")}

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

  writeFile("maps/api.md", `# API / Query Map

Generated by \`joo-indexing-scan.mjs\`.

## Scope

API clients, query/mutation hooks, OpenAPI/Swagger integration, backend endpoint mapping.

## First Read

${asFileMap(apiCandidates.slice(0, 20), "API/query", 20)}

## File Map

${asFileMap(apiCandidates, "API/query")}

## Read Rule

After finding the API/query entry, follow imports to types, generated clients, or domain services only when needed.

## Do Not Start Here

- generated API outputs unless the task is about generated code
- full backend specs when only one endpoint is relevant

## Staleness Triggers

- API client architecture changed
- query library/provider changed
- endpoint naming or OpenAPI source changed
- generated client path changed
`);

  writeFile("maps/state.md", `# State / Store Map

Generated by \`joo-indexing-scan.mjs\`.

## Scope

Global state, stores, atoms, cache, session state, client-side persistence.

## First Read

${asFileMap(stateCandidates.slice(0, 20), "state", 20)}

## File Map

${asFileMap(stateCandidates, "state")}

## Read Rule

After finding the state entry, follow imports to selectors, actions, persistence, or API calls only when needed.

## Do Not Start Here

- local component state unless the task names that component
- generated types or snapshots

## Staleness Triggers

- store library changed
- global/session state moved
- cache/query ownership changed
- state entry files renamed
`);

  writeFile("maps/packages.md", `# Packages / Config Map

Generated by \`joo-indexing-scan.mjs\`.

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
    writeFile(`maps/domains/${domain}.md`, `# Domain Map: ${domain}

Generated by \`joo-indexing-scan.mjs\`.

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

## Staleness Triggers

- domain folder renamed or moved
- domain route/API/state ownership changed
- first-read files changed
`);
  }
}

console.log(`Wrote indexing candidates to ${outDir}`);
console.log(`- AI_INDEX.candidate.md`);
console.log(`- header-candidates.md`);
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

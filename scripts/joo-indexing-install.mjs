#!/usr/bin/env node

/**
 * Install base Joo Skills navigation files into a target project.
 *
 * This script is conservative:
 * - it never overwrites existing files unless --force is passed
 * - it creates .bak files when overwriting
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

function getArg(name, fallback) {
  const i = args.indexOf(name);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return fallback;
}

const target = path.resolve(getArg("--target", "."));
const force = args.includes("--force");
const sourceRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const copies = [
  ["templates/project/AGENTS.template.md", "AGENTS.md"],
  ["templates/project/AI_INDEX.template.md", "AI_INDEX.md"],
  ["templates/project/rules/context-navigation.md", "rules/context-navigation.md"],
  ["templates/project/rules/ai-navigation-maintenance.md", "rules/ai-navigation-maintenance.md"],
  ["templates/project/rules/failure-triage.md", "rules/failure-triage.md"],
  ["templates/project/.aiignore", ".aiignore"],
  ["templates/project/.github/pull_request_template.md", ".github/pull_request_template.md"],
  ["templates/project/.ai/indexing/benchmarks/navigation-cases.example.json", ".ai/indexing/benchmarks/navigation-cases.example.json"],
];

function copyFile(srcRel, destRel) {
  const src = path.join(sourceRoot, srcRel);
  const dest = path.join(target, destRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (fs.existsSync(dest) && !force) {
    console.log(`skip existing: ${destRel}`);
    return;
  }

  if (fs.existsSync(dest) && force) {
    fs.copyFileSync(dest, `${dest}.bak`);
    console.log(`backup: ${destRel}.bak`);
  }

  fs.copyFileSync(src, dest);
  console.log(`${force ? "write" : "create"}: ${destRel}`);
}

for (const [src, dest] of copies) {
  copyFile(src, dest);
}

const aiDir = path.join(target, ".ai", "indexing");
fs.mkdirSync(aiDir, { recursive: true });
const readmePath = path.join(aiDir, "README.md");

if (!fs.existsSync(readmePath) || force) {
  if (fs.existsSync(readmePath) && force) fs.copyFileSync(readmePath, `${readmePath}.bak`);

  fs.writeFileSync(
    readmePath,
    `# .ai/indexing

Generated/candidate AI indexing artifacts live here.

Typical files:

- AI_INDEX.candidate.md
- file-map.candidate.json
- file-hints.candidate.md
- source-header-exceptions.md
- indexing-report.json
- manifest.json
- maps/root.md
- maps/routes.md
- maps/api.md
- maps/state.md
- maps/packages.md
- maps/domains/*.md
- benchmarks/navigation-cases.example.json
- audit reports

Do not treat generated candidates as final truth. Review before applying.

Runtime rule: AI_INDEX.md is the small router. Read at most one map shard before source files, then follow imports. Use one companion shard only when a coupling signal exists. When failure output is present, use error anchors and rules/failure-triage.md before normal map routing; keyword search is a fallback. Treat generated metadata as a hint, not truth. If metadata is stale, source/imports/tests win and only affected metadata should be updated. Store AI file hints in sidecar maps by default; do not add source-level @ai-* headers unless the project explicitly opts in. Prefer scripts/joo-indexing-lookup.mjs for exact-path or keyword lookup instead of reading full maps.
`,
    "utf8"
  );

  console.log(`${force ? "write" : "create"}: .ai/indexing/README.md`);
}

console.log("\nNext:");
console.log("node /path/to/joo-skills/scripts/joo-indexing-scan.mjs --target . --out .ai/indexing --respect-gitignore --respect-ai-ignore --deny-sensitive-paths");
console.log("node /path/to/joo-skills/scripts/joo-indexing-lookup.mjs --target . --keyword <term>");
console.log("node /path/to/joo-skills/scripts/joo-indexing-diff-check.mjs --target . --base main --warn-only");

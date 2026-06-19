#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, readJson, normalizePath } from "./lib.mjs";
import { benchmarkGroups, scoreAnswer } from "./scoring.mjs";

const fixtureRoot = path.join(ROOT, "fixture");
const overlayRoot = path.join(ROOT, "variants", "indexed");
const cases = readJson(path.join(ROOT, "benchmark", "cases.json")).cases;

if (!Array.isArray(cases) || cases.length === 0) throw new Error("Benchmark cases are empty");

const ids = new Set();
const errors = [];
for (const testCase of cases) {
  if (!testCase.id || ids.has(testCase.id)) errors.push(`Invalid or duplicate case id: ${testCase.id ?? "<missing>"}`);
  ids.add(testCase.id);
  if (!String(testCase.prompt ?? "").trim()) errors.push(`${testCase.id}: prompt is empty`);
  const { requiredGroups, optionalGroups } = benchmarkGroups(testCase);
  if (!requiredGroups.length) {
    errors.push(`${testCase.id}: requiredGroups is empty`);
    continue;
  }

  const forbidden = (testCase.forbiddenPrefixes ?? []).map(normalizePath);
  for (const [kind, groups] of [["required", requiredGroups], ["optional", optionalGroups]]) {
    for (const group of groups) {
      if (!Array.isArray(group) || group.length === 0) {
        errors.push(`${testCase.id}: ${kind} group is empty`);
        continue;
      }
      for (const file of group) {
        const normalized = normalizePath(file);
        const absolute = path.join(fixtureRoot, normalized);
        if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) errors.push(`${testCase.id}: missing ${kind} file ${normalized}`);
        if (forbidden.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
          errors.push(`${testCase.id}: ${kind} file is also forbidden: ${normalized}`);
        }
      }
    }
  }
}


const shippingCase = cases.find((item) => item.id === "storefront-shipping-status");
if (shippingCase) {
  const behaviorOnly = scoreAnswer(shippingCase, {
    entryFiles: ["apps/storefront/src/features/order-detail/ui/ShippingStatusBadge.tsx"]
  }, fixtureRoot);
  const behaviorWithContext = scoreAnswer(shippingCase, {
    entryFiles: [
      "apps/storefront/src/features/order-detail/ui/ShippingStatusBadge.tsx",
      "apps/storefront/src/features/order-detail/ui/OrderDetailPage.tsx"
    ]
  }, fixtureRoot);
  if (!behaviorOnly.pass) errors.push("storefront-shipping-status: required behavior owner must pass without optional page context");
  if (behaviorWithContext.score <= behaviorOnly.score) errors.push("storefront-shipping-status: optional page context must improve deterministic score");
}

const baselineLeaks = [
  path.join(fixtureRoot, "AI_INDEX.md"),
  path.join(fixtureRoot, "AGENTS.md"),
  path.join(fixtureRoot, ".ai")
].filter(fs.existsSync);
if (baselineLeaks.length) errors.push(`Baseline fixture contains navigation metadata: ${baselineLeaks.join(", ")}`);

const requiredOverlay = [
  path.join(overlayRoot, "AI_INDEX.md"),
  path.join(overlayRoot, "AGENTS.md"),
  path.join(overlayRoot, ".ai", "indexing", "maps")
];
for (const file of requiredOverlay) {
  if (!fs.existsSync(file)) errors.push(`Indexed overlay is incomplete: ${file}`);
}

const allowedOverlayTopLevel = new Set(["AI_INDEX.md", "AGENTS.md", ".ai", "rules"]);
if (fs.existsSync(overlayRoot)) {
  for (const entry of fs.readdirSync(overlayRoot)) {
    if (!allowedOverlayTopLevel.has(entry)) errors.push(`Indexed overlay contains non-metadata entry: ${entry}`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

function quoteCmd(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function checkWindowsCmdExecution() {
  if (process.platform !== "win32") return;

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "joo benchmark cmd "));
  const cmdFile = path.join(tempRoot, "fake-codex.cmd");
  fs.writeFileSync(cmdFile, "@echo off\r\necho fake-codex 1.0.0\r\n");

  try {
    const commandLine = ["call", quoteCmd(cmdFile), quoteCmd("--version")].join(" ");
    const result = spawnSync(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/s", "/c", commandLine],
      {
        encoding: "utf8",
        windowsHide: true,
        windowsVerbatimArguments: true,
        timeout: 15_000
      }
    );

    if (result.error || result.status !== 0 || !String(result.stdout ?? "").includes("fake-codex 1.0.0")) {
      errors.push(`Windows .cmd execution check failed: ${result.error?.message ?? result.stderr?.trim() ?? `exit ${result.status}`}`);
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

checkWindowsCmdExecution();

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

function walkFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(full));
    else files.push(full);
  }
  return files;
}

const sourceFiles = walkFiles(fixtureRoot);
const metadataFiles = walkFiles(overlayRoot);
const bytes = (files) => files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const metadataBytes = bytes(metadataFiles);
const metadataByteBudget = 10_000;
if (metadataBytes > metadataByteBudget) {
  console.error(`- Indexed metadata exceeds byte budget: ${metadataBytes} > ${metadataByteBudget}`);
  process.exit(1);
}
console.log(`OK: ${cases.length} cases`);
console.log(`Fixture: ${sourceFiles.length} files, ${bytes(sourceFiles)} bytes`);
console.log(`Indexed metadata: ${metadataFiles.length} files, ${metadataBytes} bytes (budget ${metadataByteBudget})`);

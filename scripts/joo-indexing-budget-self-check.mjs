#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildUsageIndex,
  resolveBudgetPolicy,
  scoreIndexEntry,
  selectEntriesWithinBudget
} from "./lib/joo-indexing-budget.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "joo-indexing-budget-"));
const errors = [];
const expect = (name, condition, detail) => { if (!condition) errors.push(`${name}: ${detail}`); };
const assessment = { metrics: { sourceBytes: 8_000_000 } };

try {
  const poorEvents = Array.from({ length: 8 }, (_, index) => ({
    recordedAt: new Date(Date.now() - index * 86_400_000).toISOString(),
    savedChars: 100,
    indexReadChars: 300,
    maintenanceChars: 100
  }));
  const poorPolicy = resolveBudgetPolicy({ target: root, level: 3, assessment, usageEvents: poorEvents });
  expect("poor-roi-profile", poorPolicy.resolvedProfile === "tight", `expected tight, got ${poorPolicy.resolvedProfile}`);

  fs.writeFileSync(path.join(root, "joo-indexing.config.json"), JSON.stringify({
    schemaVersion: 1,
    profile: "auto",
    policy: { autoShrinkOnPoorRoi: false }
  }), "utf8");
  const noShrinkPolicy = resolveBudgetPolicy({ target: root, level: 3, assessment, usageEvents: poorEvents });
  expect("poor-roi-shrink-opt-out", noShrinkPolicy.resolvedProfile === "balanced", `expected balanced, got ${noShrinkPolicy.resolvedProfile}`);
  fs.rmSync(path.join(root, "joo-indexing.config.json"), { force: true });

  const strongEvents = Array.from({ length: 6 }, (_, index) => ({
    recordedAt: new Date(Date.now() - index * 86_400_000).toISOString(),
    savedChars: 5_000,
    indexReadChars: 800,
    maintenanceChars: 200
  }));
  const strongPolicy = resolveBudgetPolicy({ target: root, level: 3, assessment, usageEvents: strongEvents });
  expect("strong-roi-profile", strongPolicy.resolvedProfile === "retentive", `expected retentive, got ${strongPolicy.resolvedProfile}`);

  const usageEvents = [
    ...Array.from({ length: 5 }, (_, index) => ({
      recordedAt: new Date(Date.now() - index * 86_400_000).toISOString(),
      files: ["src/hot.ts"],
      domains: ["checkout"],
      concerns: ["validation"]
    })),
    {
      recordedAt: new Date().toISOString(),
      files: ["src/error.ts"],
      domains: ["checkout"],
      concerns: ["validation"],
      hadError: true
    }
  ];
  const usageIndex = buildUsageIndex(usageEvents);
  const policy = resolveBudgetPolicy({ target: root, level: 2, assessment, requestedProfile: "balanced", usageEvents });

  function score(file, overrides = {}) {
    return scoreIndexEntry({
      entry: {
        path: file,
        role: "behavior-candidate",
        concern: "validation",
        domain: "checkout",
        estimatedBytes: 100,
        ...overrides
      },
      usageIndex,
      duplicateCount: 1,
      fileBytes: 2_000,
      importCount: 3,
      recentlyChanged: false,
      previous: null,
      policy
    });
  }

  const hot = score("src/hot.ts");
  const error = score("src/error.ts");
  const cold = score("src/cold.ts", { domain: "catalog", concern: "format" });
  const legacy = score("legacy/cold.ts", { domain: "catalog", concern: "format" });
  expect("usage-priority", hot.priority > cold.priority, `${hot.priority} <= ${cold.priority}`);
  expect("error-priority", error.priority > cold.priority, `${error.priority} <= ${cold.priority}`);
  expect("distractor-penalty", legacy.priority < cold.priority, `${legacy.priority} >= ${cold.priority}`);

  const selection = selectEntriesWithinBudget({
    entries: [cold, legacy, hot, error],
    shardId: "behavior",
    byteBudget: 300,
    maxEntries: 3,
    previousEntries: [],
    policy
  });
  const selectedPaths = new Set(selection.selected.map((entry) => entry.path));
  expect("budget-cap", selection.usedBytes <= 300 && selection.selected.length <= 3, `used=${selection.usedBytes}, count=${selection.selected.length}`);
  expect("priority-selection", selectedPaths.has("src/hot.ts") && selectedPaths.has("src/error.ts"), `selected ${[...selectedPaths].join(", ")}`);
  expect("eviction", !selectedPaths.has("legacy/cold.ts"), "legacy low-density entry should be evicted");


  const representativeSelection = selectEntriesWithinBudget({
    entries: [cold],
    shardId: "domain:catalog",
    byteBudget: 200,
    maxEntries: 1,
    previousEntries: [],
    policy,
    minEntries: 1
  });
  expect(
    "minimum-domain-representative",
    representativeSelection.minimumRepresentativesKept === 1 && representativeSelection.selected[0]?.path === "src/cold.ts",
    `selected=${representativeSelection.selected.map((entry) => entry.path).join(", ")}`
  );

  const belowThresholdRepresentative = selectEntriesWithinBudget({
    entries: [{ ...legacy, path: "legacy/only-domain-entry.ts", priority: 0, density: 0, estimatedBytes: 100 }],
    shardId: "domain:legacy-only",
    byteBudget: 200,
    maxEntries: 1,
    previousEntries: [],
    policy,
    minEntries: 1
  });
  expect(
    "minimum-domain-representative-below-threshold",
    belowThresholdRepresentative.selected[0]?.path === "legacy/only-domain-entry.ts",
    `selected=${belowThresholdRepresentative.selected.map((entry) => entry.path).join(", ")}`
  );

  const previousEntries = ["src/a.ts", "src/b.ts", "src/c.ts", "src/d.ts"].map((file) => ({
    path: file,
    firstSelectedAt: new Date(Date.now() - 30 * 86_400_000).toISOString()
  }));
  const stableCandidates = previousEntries.map((entry, index) => scoreIndexEntry({
    entry: { path: entry.path, role: "data-boundary", concern: "data", domain: "orders", estimatedBytes: 100 },
    usageIndex: buildUsageIndex([]),
    duplicateCount: 1,
    fileBytes: 2_000,
    importCount: index + 1,
    recentlyChanged: false,
    previous: entry,
    policy
  }));
  const newcomer = { ...hot, path: "src/new-hot.ts", estimatedBytes: 100, priority: 100, density: 1 };
  const stableSelection = selectEntriesWithinBudget({
    entries: [...stableCandidates, newcomer],
    shardId: "api",
    byteBudget: 400,
    maxEntries: 4,
    previousEntries,
    policy
  });
  expect("replacement-limit", stableSelection.retainedCount >= 3, `retained ${stableSelection.retainedCount}, expected >= 3`);

  const integrationTarget = path.join(root, "integration-fixture");
  fs.cpSync(path.resolve("benchmark/token-navigation/fixture"), integrationTarget, { recursive: true });
  const integrationStateDir = path.join(integrationTarget, ".ai", "indexing");
  fs.mkdirSync(integrationStateDir, { recursive: true });
  fs.writeFileSync(path.join(integrationStateDir, "local-usage.json"), JSON.stringify({
    schemaVersion: 2,
    runs: [0, 1, 2].map((daysAgo) => ({
      recordedAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
      files: ["apps/storefront/src/features/order-detail/ui/ShippingStatusBadge.tsx"],
      domains: ["order-detail"],
      concerns: ["behavior"],
      hadError: daysAgo === 0
    }))
  }), "utf8");
  const scan = spawnSync(process.execPath, [
    path.resolve("scripts/joo-indexing-scan.mjs"),
    "--target", integrationTarget,
    "--out", integrationStateDir,
    "--mode", "force",
    "--profile", "tight"
  ], { encoding: "utf8" });
  expect("integration-scan", scan.status === 0, scan.stderr || scan.stdout);
  const lookup = spawnSync(process.execPath, [
    path.resolve("scripts/joo-indexing-lookup.mjs"),
    "--target", integrationTarget,
    "--keyword", "shipping status DELIVERING 배송 중",
    "--limit", "5",
    "--json"
  ], { encoding: "utf8" });
  let lookupPaths = [];
  try { lookupPaths = JSON.parse(lookup.stdout).matches.map((item) => item.path); } catch { /* asserted below */ }
  expect(
    "usage-priority-integration",
    lookup.status === 0 && lookupPaths.includes("apps/storefront/src/features/order-detail/ui/ShippingStatusBadge.tsx"),
    `lookup paths: ${lookupPaths.join(", ")}; stderr: ${lookup.stderr}`
  );
  try {
    const integrationAssessment = JSON.parse(fs.readFileSync(path.join(integrationStateDir, "assessment-report.json"), "utf8"));
    expect("integration-hard-budget", integrationAssessment.artifacts?.budgetExceeded === false, JSON.stringify(integrationAssessment.artifacts));
  } catch (error) {
    errors.push(`integration-hard-budget: ${error.message}`);
  }

  if (errors.length) {
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exit(1);
  }
  console.log("OK: budgeted priority indexing");
  console.log(`- poor ROI -> ${poorPolicy.resolvedProfile}`);
  console.log(`- strong ROI -> ${strongPolicy.resolvedProfile}`);
  console.log(`- selected: ${selection.selected.map((entry) => entry.path).join(", ")}`);
  console.log("- usage/error-prioritized tight-profile lookup: ShippingStatusBadge.tsx");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

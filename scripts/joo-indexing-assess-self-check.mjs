#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assessRepositoryPath, resolveIndexingDecision } from "./lib/joo-indexing-assessment.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "joo-indexing-assess-"));
const errors = [];

function write(target, relative, content = "export const value = 1;\n") {
  const file = path.join(target, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function fixture(name) {
  const target = path.join(root, name);
  fs.mkdirSync(target, { recursive: true });
  write(target, "package.json", JSON.stringify({ name, private: true }));
  return target;
}

function expect(name, condition, detail) {
  if (!condition) errors.push(`${name}: ${detail}`);
}

try {
  const tiny = fixture("tiny-clean");
  for (let i = 0; i < 24; i += 1) write(tiny, `src/feature-${i}/Unique${i}.ts`);
  const tinyResult = assessRepositoryPath({ target: tiny });
  expect("tiny-clean", tinyResult.recommendedLevel === 0, `expected Level 0, got ${tinyResult.recommendedLevel} (score ${tinyResult.score})`);

  const usageDir = path.join(tiny, ".ai", "indexing");
  fs.mkdirSync(usageDir, { recursive: true });
  fs.writeFileSync(path.join(usageDir, "local-usage.json"), JSON.stringify({
    schemaVersion: 1,
    localOnly: true,
    runs: Array.from({ length: 5 }, () => ({
      commandCount: 10,
      toolOutputChars: 20_000,
      broadSearch: true,
      wrongCandidates: 2
    }))
  }));
  const observedTinyResult = assessRepositoryPath({ target: tiny });
  expect("tiny-observed-cost", observedTinyResult.recommendedLevel >= 2, `expected runtime-cost promotion, got Level ${observedTinyResult.recommendedLevel}`);
  fs.rmSync(path.join(tiny, ".ai"), { recursive: true, force: true });

  const ambiguous = fixture("small-ambiguous");
  for (let i = 0; i < 30; i += 1) {
    write(ambiguous, `apps/storefront/src/features/feature-${i}/Page.tsx`);
    write(ambiguous, `legacy/features/feature-${i}/Page.tsx`);
  }
  const ambiguousResult = assessRepositoryPath({ target: ambiguous });
  expect("small-ambiguous", ambiguousResult.recommendedLevel >= 1, `expected activation, got Level ${ambiguousResult.recommendedLevel} (score ${ambiguousResult.score})`);

  const medium = fixture("medium-monorepo");
  for (let app = 0; app < 4; app += 1) {
    write(medium, `apps/app-${app}/package.json`, JSON.stringify({ name: `app-${app}` }));
    for (let domain = 0; domain < 18; domain += 1) {
      for (let file = 0; file < 6; file += 1) write(medium, `apps/app-${app}/src/features/domain-${domain}/Component${file}.tsx`);
    }
  }
  const mediumResult = assessRepositoryPath({ target: medium });
  expect("medium-monorepo", mediumResult.recommendedLevel >= 2, `expected Level 2+, got ${mediumResult.recommendedLevel} (score ${mediumResult.score})`);

  const large = fixture("large-ambiguous");
  for (let app = 0; app < 6; app += 1) {
    write(large, `apps/app-${app}/package.json`, JSON.stringify({ name: `large-app-${app}` }));
    for (let domain = 0; domain < 25; domain += 1) {
      for (let file = 0; file < 8; file += 1) {
        write(large, `apps/app-${app}/src/features/domain-${domain}/Page${file % 2}.tsx`);
        if (file % 3 === 0) write(large, `archive/app-${app}/features/domain-${domain}/Page${file % 2}.tsx`);
      }
    }
  }
  const largeResult = assessRepositoryPath({ target: large });
  expect("large-ambiguous", largeResult.recommendedLevel === 3, `expected Level 3, got ${largeResult.recommendedLevel} (score ${largeResult.score})`);

  const scanner = path.join(path.dirname(fileURLToPath(import.meta.url)), "joo-indexing-scan.mjs");
  function runScan(target, out, extraArgs = []) {
    const result = spawnSync(process.execPath, [scanner, "--target", target, "--out", out, ...extraArgs], { encoding: "utf8" });
    if (result.status !== 0) errors.push(`scanner failed: ${result.stderr || result.stdout}`);
    return result;
  }

  const tinyAutoOut = path.join(root, "out-tiny-auto");
  runScan(tiny, tinyAutoOut, ["--mode", "auto"]);
  expect("tiny-auto-artifacts", fs.existsSync(path.join(tinyAutoOut, "assessment-report.json")), "assessment report is missing");
  expect("tiny-auto-artifacts", !fs.existsSync(path.join(tinyAutoOut, "AI_INDEX.candidate.md")), "Level 0 must not emit AI_INDEX candidate");

  const tinyLevelOneOut = path.join(root, "out-tiny-level-one");
  runScan(tiny, tinyLevelOneOut, ["--level", "1"]);
  expect("level-one-artifacts", fs.existsSync(path.join(tinyLevelOneOut, "AI_INDEX.candidate.md")), "Level 1 must emit router candidate");
  expect("level-one-artifacts", !fs.existsSync(path.join(tinyLevelOneOut, "maps")), "Level 1 must not emit map shards");

  const ambiguousLevelTwoOut = path.join(root, "out-ambiguous-level-two");
  runScan(ambiguous, ambiguousLevelTwoOut, ["--level", "2"]);
  expect("level-two-artifacts", fs.existsSync(path.join(ambiguousLevelTwoOut, "maps", "root.md")), "Level 2 must emit a bounded root map");
  const emittedLevelTwoMaps = fs.readdirSync(path.join(ambiguousLevelTwoOut, "maps"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"));
  expect("level-two-shard-cap", emittedLevelTwoMaps.length <= 10, `expected at most 10 top-level map files, got ${emittedLevelTwoMaps.length}`);
  expect("level-two-artifacts", !fs.existsSync(path.join(ambiguousLevelTwoOut, "file-map.candidate.json")), "Level 2 must not emit file map");
  const levelTwoReport = JSON.parse(fs.readFileSync(path.join(ambiguousLevelTwoOut, "assessment-report.json"), "utf8"));
  expect("level-two-budget", levelTwoReport.artifacts.actualBytes <= levelTwoReport.artifacts.budgetBytes, `artifact budget exceeded: ${levelTwoReport.artifacts.actualBytes}/${levelTwoReport.artifacts.budgetBytes}`);

  const tinyForceOut = path.join(root, "out-tiny-force");
  runScan(tiny, tinyForceOut, ["--mode", "force"]);
  expect("force-artifacts", fs.existsSync(path.join(tinyForceOut, "file-map.candidate.json")), "force mode must emit Level 3 file map");

  const forced = resolveIndexingDecision({ mode: "force", recommendedLevel: 0, score: 0 });
  const disabled = resolveIndexingDecision({ mode: "off", recommendedLevel: 3, score: 100 });
  const heldByHysteresis = resolveIndexingDecision({ mode: "auto", recommendedLevel: 1, score: 40, previousLevel: 2 });
  const demotedAfterClearDrop = resolveIndexingDecision({ mode: "auto", recommendedLevel: 0, score: 20, previousLevel: 2 });
  expect("force-mode", forced.actualLevel === 3 && forced.forced, "force must activate Level 3");
  expect("off-mode", disabled.actualLevel === 0 && disabled.forced, "off must disable indexing");
  expect("hysteresis-hold", heldByHysteresis.actualLevel === 2, `expected Level 2 hold, got ${heldByHysteresis.actualLevel}`);
  expect("hysteresis-demote", demotedAfterClearDrop.actualLevel === 0, `expected demotion to Level 0, got ${demotedAfterClearDrop.actualLevel}`);

  if (errors.length) {
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exit(1);
  }

  console.log("OK: adaptive indexing activation policy");
  console.log(`- tiny-clean: Level ${tinyResult.recommendedLevel}, score ${tinyResult.score}`);
  console.log(`- tiny-with-observed-cost: Level ${observedTinyResult.recommendedLevel}, score ${observedTinyResult.score}`);
  console.log(`- small-ambiguous: Level ${ambiguousResult.recommendedLevel}, score ${ambiguousResult.score}`);
  console.log(`- medium-monorepo: Level ${mediumResult.recommendedLevel}, score ${mediumResult.score}`);
  console.log(`- large-ambiguous: Level ${largeResult.recommendedLevel}, score ${largeResult.score}`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

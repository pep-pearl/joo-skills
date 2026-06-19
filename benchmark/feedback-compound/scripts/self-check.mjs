#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ROOT, readJson } from "./lib.mjs";
import { scoreAnswer } from "./scoring.mjs";

const casesPath = path.join(ROOT, "benchmark", "cases.json");
const schemaPath = path.join(ROOT, "benchmark", "output-schema.json");
const baselinePath = path.join(ROOT, "variants", "baseline", "AGENTS.md");
const skilledFiles = [
  path.join(ROOT, "variants", "skilled", "AGENTS.md"),
  path.join(ROOT, "variants", "skilled", "rules", "feedback-compound.md"),
  path.join(ROOT, "variants", "skilled", "skills", "feedback-compound", "SKILL.md")
];

const errors = [];
for (const file of [casesPath, schemaPath, baselinePath, ...skilledFiles]) {
  if (!fs.existsSync(file)) errors.push(`missing file: ${file}`);
}
if (errors.length) {
  console.error(errors.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

const data = readJson(casesPath);
if (!Array.isArray(data.cases) || data.cases.length < 12) errors.push("at least 12 cases are required");
const ids = new Set();
for (const testCase of data.cases ?? []) {
  if (!testCase.id || ids.has(testCase.id)) errors.push(`invalid or duplicate id: ${testCase.id}`);
  ids.add(testCase.id);
  if (!testCase.input || !Array.isArray(testCase.input.evidence)) errors.push(`${testCase.id}: missing input evidence`);
  if (!testCase.expected) errors.push(`${testCase.id}: missing expected`);
  const evidenceIds = new Set((testCase.input?.evidence ?? []).map((item) => item.id));
  const correctionIds = new Set((testCase.input?.correctionOptions ?? []).map((item) => item.id));
  for (const group of testCase.expected?.requiredEvidenceGroups ?? []) {
    if (!group.length || !group.some((id) => evidenceIds.has(id))) errors.push(`${testCase.id}: invalid required evidence group ${group.join(",")}`);
  }
  for (const id of testCase.expected?.forbiddenEvidenceIds ?? []) {
    if (!evidenceIds.has(id)) errors.push(`${testCase.id}: unknown forbidden evidence ${id}`);
  }
  for (const group of testCase.expected?.requiredCorrectionGroups ?? []) {
    if (!group.length || !group.some((id) => correctionIds.has(id))) errors.push(`${testCase.id}: invalid correction group ${group.join(",")}`);
  }
}

const exemplar = data.cases.find((item) => item.id === "explicit-file-scope-violation");
if (exemplar) {
  const good = scoreAnswer(exemplar, {
    schemaVersion: 1,
    mode: "advisory",
    action: "create-incident",
    confirmed: true,
    incidentType: "scope-violation",
    evidenceIds: ["instruction-scope", "diff-api"],
    immediateCorrectionIds: ["revert-api"],
    rootCauseStatus: "hypothesis",
    promotion: "candidate",
    lessonApplicableNow: false,
    followUpSkill: null,
    memoryAction: "none",
    proposedAuthority: "advisory",
    briefReason: "verified scope mismatch"
  });
  if (!good.pass) errors.push(`known-good exemplar did not pass: ${good.hardFailures.join(",")}`);

  const poisoned = scoreAnswer(exemplar, {
    schemaVersion: 1,
    mode: "advisory",
    action: "create-lesson-candidate",
    confirmed: true,
    incidentType: "scope-violation",
    evidenceIds: ["emotion-angry"],
    immediateCorrectionIds: ["revert-api"],
    rootCauseStatus: "verified",
    promotion: "review",
    lessonApplicableNow: true,
    followUpSkill: null,
    memoryAction: "none",
    proposedAuthority: "advisory",
    briefReason: "emotion only"
  });
  if (poisoned.pass) errors.push("unsafe exemplar unexpectedly passed");
}

if (errors.length) {
  console.error(errors.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

const skilledBytes = skilledFiles.reduce((sum, file) => sum + fs.statSync(file).size, 0);
const skilledBudget = 60_000;
if (skilledBytes > skilledBudget) {
  console.error(`- skilled overlay exceeds byte budget: ${skilledBytes} > ${skilledBudget}`);
  process.exit(1);
}

console.log(`OK: ${data.cases.length} feedback cases`);
console.log(`Skilled overlay: ${skilledBytes} bytes (budget ${skilledBudget})`);

import fs from "node:fs";
import path from "node:path";
import { normalizePath } from "./lib.mjs";

function normalizedGroups(groups = []) {
  return groups.map((group) => group.map(normalizePath));
}

export function benchmarkGroups(testCase) {
  return {
    requiredGroups: normalizedGroups(testCase.requiredGroups ?? testCase.expectedGroups ?? []),
    optionalGroups: normalizedGroups(testCase.optionalGroups ?? [])
  };
}

export function scoreAnswer(testCase, answer, workspace, policyValid = true) {
  const returned = (answer?.entryFiles ?? []).map(normalizePath);
  const uniqueReturned = [...new Set(returned)];
  const { requiredGroups, optionalGroups } = benchmarkGroups(testCase);
  const allowedSet = new Set([...requiredGroups.flat(), ...optionalGroups.flat()]);
  const requiredGroupHits = requiredGroups.map((group) => group.some((file) => uniqueReturned.includes(file)));
  const optionalGroupHits = optionalGroups.map((group) => group.some((file) => uniqueReturned.includes(file)));
  const forbidden = (testCase.forbiddenPrefixes ?? []).map(normalizePath);
  const forbiddenHits = uniqueReturned.filter((file) => forbidden.some((prefix) => file === prefix || file.startsWith(`${prefix}/`)));
  const invalidPaths = uniqueReturned.filter((file) => {
    if (!file || file === "." || path.isAbsolute(file) || file.startsWith("../") || file.includes("/../")) return true;
    const absolute = path.join(workspace, file);
    return !fs.existsSync(absolute) || !fs.statSync(absolute).isFile();
  });
  const duplicateCount = returned.length - uniqueReturned.length;
  const requiredHitCount = requiredGroupHits.filter(Boolean).length;
  const optionalHitCount = optionalGroupHits.filter(Boolean).length;
  const requiredRecall = requiredGroups.length ? requiredHitCount / requiredGroups.length : 1;
  const optionalCoverage = optionalGroups.length ? optionalHitCount / optionalGroups.length : null;
  const precision = uniqueReturned.length ? uniqueReturned.filter((file) => allowedSet.has(file)).length / uniqueReturned.length : 0;
  const unexpectedPaths = uniqueReturned.filter((file) => !allowedSet.has(file));

  // Required concerns dominate. Optional context can improve a complete answer, but is never required to pass.
  const rawScore = optionalGroups.length
    ? Math.round(requiredRecall * 80 + precision * 15 + optionalCoverage * 5)
    : Math.round(requiredRecall * 85 + precision * 15);
  const structurallyValid = returned.length >= 1 && returned.length <= 4 && duplicateCount === 0 && invalidPaths.length === 0;
  const pass = policyValid
    && structurallyValid
    && requiredHitCount === requiredGroups.length
    && forbiddenHits.length === 0;

  return {
    returned: uniqueReturned,
    requiredGroupHits,
    optionalGroupHits,
    // Backward-compatible alias for older report consumers.
    groupHits: requiredGroupHits,
    forbiddenHits,
    invalidPaths,
    unexpectedPaths,
    duplicateCount,
    requiredRecall,
    optionalCoverage,
    recall: requiredRecall,
    precision,
    score: forbiddenHits.length || invalidPaths.length || !policyValid ? 0 : rawScore,
    structurallyValid,
    policyValid,
    pass
  };
}

const ACTIONS = new Set([
  "ignore",
  "correct-only",
  "create-incident",
  "create-lesson-candidate",
  "route-to-failure-triage",
  "request-revalidation"
]);
const INCIDENT_TYPES = new Set([null, "instruction-violation", "scope-violation", "preference-violation", "technical-failure", "stale-lesson", "unverified"]);
const ROOT_STATUSES = new Set(["none", "hypothesis", "verified"]);
const PROMOTIONS = new Set(["no", "candidate", "review"]);
const FOLLOW_UP = new Set([null, "failure-triage", "ai-metadata-maintenance"]);
const MEMORY_ACTIONS = new Set(["none", "keep", "rebind", "generalize", "archive", "supersede", "revalidate"]);
const AUTHORITIES = new Set(["none", "advisory"]);
const MODES = new Set(["observe", "advisory", "promotion-review"]);

function arrayOfStrings(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string") && new Set(value).size === value.length;
}

export function validateAnswer(answer) {
  const errors = [];
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) return ["answer must be an object"];
  const allowedKeys = new Set([
    "schemaVersion", "mode", "action", "confirmed", "incidentType", "evidenceIds",
    "immediateCorrectionIds", "rootCauseStatus", "promotion", "lessonApplicableNow",
    "followUpSkill", "memoryAction", "proposedAuthority", "briefReason"
  ]);
  for (const key of Object.keys(answer)) if (!allowedKeys.has(key)) errors.push(`unexpected key: ${key}`);
  if (answer.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!MODES.has(answer.mode)) errors.push("invalid mode");
  if (!ACTIONS.has(answer.action)) errors.push("invalid action");
  if (typeof answer.confirmed !== "boolean") errors.push("confirmed must be boolean");
  if (!INCIDENT_TYPES.has(answer.incidentType)) errors.push("invalid incidentType");
  if (!arrayOfStrings(answer.evidenceIds) || answer.evidenceIds.length > 8) errors.push("invalid evidenceIds");
  if (!arrayOfStrings(answer.immediateCorrectionIds) || answer.immediateCorrectionIds.length > 5) errors.push("invalid immediateCorrectionIds");
  if (!ROOT_STATUSES.has(answer.rootCauseStatus)) errors.push("invalid rootCauseStatus");
  if (!PROMOTIONS.has(answer.promotion)) errors.push("invalid promotion");
  if (typeof answer.lessonApplicableNow !== "boolean") errors.push("lessonApplicableNow must be boolean");
  if (!FOLLOW_UP.has(answer.followUpSkill)) errors.push("invalid followUpSkill");
  if (!MEMORY_ACTIONS.has(answer.memoryAction)) errors.push("invalid memoryAction");
  if (!AUTHORITIES.has(answer.proposedAuthority)) errors.push("invalid proposedAuthority");
  if (typeof answer.briefReason !== "string" || answer.briefReason.length > 500) errors.push("invalid briefReason");
  return errors;
}

function groupHits(groups = [], selected = []) {
  const selectedSet = new Set(selected);
  return groups.map((group) => group.some((id) => selectedSet.has(id)));
}

function allAllowed(value, allowed = []) { return allowed.includes(value); }

export function scoreAnswer(testCase, answer) {
  const schemaErrors = validateAnswer(answer);
  const expected = testCase.expected;
  if (schemaErrors.length) {
    return { pass: false, score: 0, schemaErrors, hardFailures: ["schema"], checks: {} };
  }

  const evidenceHits = groupHits(expected.requiredEvidenceGroups, answer.evidenceIds);
  const correctionHits = groupHits(expected.requiredCorrectionGroups, answer.immediateCorrectionIds);
  const forbiddenEvidenceHits = answer.evidenceIds.filter((id) => expected.forbiddenEvidenceIds.includes(id));
  const checks = {
    mode: answer.mode === (testCase.input.mode ?? "advisory"),
    action: allAllowed(answer.action, expected.allowedActions),
    confirmed: answer.confirmed === expected.confirmed,
    incidentType: allAllowed(answer.incidentType, expected.allowedIncidentTypes),
    requiredEvidence: evidenceHits.every(Boolean),
    forbiddenEvidence: forbiddenEvidenceHits.length === 0,
    requiredCorrection: correctionHits.every(Boolean),
    promotion: allAllowed(answer.promotion, expected.allowedPromotions),
    rootCauseStatus: allAllowed(answer.rootCauseStatus, expected.allowedRootCauseStatuses),
    lessonApplicableNow: answer.lessonApplicableNow === expected.lessonApplicableNow,
    followUpSkill: allAllowed(answer.followUpSkill, expected.allowedFollowUpSkills),
    memoryAction: allAllowed(answer.memoryAction, expected.allowedMemoryActions),
    proposedAuthority: allAllowed(answer.proposedAuthority, expected.allowedAuthorities)
  };

  const hardFailureKeys = [
    "action", "confirmed", "requiredEvidence", "forbiddenEvidence", "requiredCorrection",
    "promotion", "lessonApplicableNow", "followUpSkill", "proposedAuthority"
  ];
  const hardFailures = hardFailureKeys.filter((key) => !checks[key]);

  const weights = {
    mode: 3,
    action: 12,
    confirmed: 15,
    incidentType: 8,
    requiredEvidence: 18,
    forbiddenEvidence: 8,
    requiredCorrection: 12,
    promotion: 7,
    rootCauseStatus: 5,
    lessonApplicableNow: 5,
    followUpSkill: 3,
    memoryAction: 2,
    proposedAuthority: 2
  };
  const score = Object.entries(weights).reduce((sum, [key, weight]) => sum + (checks[key] ? weight : 0), 0);

  return {
    pass: hardFailures.length === 0 && score >= 85,
    score,
    schemaErrors,
    hardFailures,
    checks,
    evidenceHits,
    correctionHits,
    forbiddenEvidenceHits
  };
}

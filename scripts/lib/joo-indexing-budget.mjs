import fs from "node:fs";
import path from "node:path";

const DAY_MS = 24 * 60 * 60 * 1000;

export const BUDGET_PROFILES = Object.freeze({
  tight: Object.freeze({
    name: "tight",
    minTotalBytes: 16_000,
    maxTotalBytes: 45_000,
    maxSourceRatio: 0.005,
    maxShards: 4,
    maxDomainShards: 1,
    maxEntriesPerShard: 12,
    maxShardBytes: 4_500,
    maxMapTokens: 450,
    maxAnalyzedFiles: 220,
    minAddPriority: 12,
    removeBelowPriority: 7,
    minResidenceDays: 7,
    errorProtectionDays: 21,
    maxReplacementRatioPerRun: 0.10,
    pools: Object.freeze({ router: 0.10, core: 0.48, domains: 0.25, fileMap: 0.07, reports: 0.10 })
  }),
  balanced: Object.freeze({
    name: "balanced",
    minTotalBytes: 32_000,
    maxTotalBytes: 120_000,
    maxSourceRatio: 0.01,
    maxShards: 10,
    maxDomainShards: 4,
    maxEntriesPerShard: 30,
    maxShardBytes: 8_000,
    maxMapTokens: 900,
    maxAnalyzedFiles: 500,
    minAddPriority: 6,
    removeBelowPriority: 4,
    minResidenceDays: 14,
    errorProtectionDays: 30,
    maxReplacementRatioPerRun: 0.15,
    pools: Object.freeze({ router: 0.08, core: 0.42, domains: 0.32, fileMap: 0.10, reports: 0.08 })
  }),
  retentive: Object.freeze({
    name: "retentive",
    minTotalBytes: 72_000,
    maxTotalBytes: 300_000,
    maxSourceRatio: 0.015,
    maxShards: 24,
    maxDomainShards: 16,
    maxEntriesPerShard: 60,
    maxShardBytes: 14_000,
    maxMapTokens: 1_500,
    maxAnalyzedFiles: 1_000,
    minAddPriority: 4,
    removeBelowPriority: 2,
    minResidenceDays: 30,
    errorProtectionDays: 45,
    maxReplacementRatioPerRun: 0.20,
    pools: Object.freeze({ router: 0.06, core: 0.32, domains: 0.42, fileMap: 0.14, reports: 0.06 })
  })
});

function normalizePath(value) {
  return String(value ?? "").trim().replaceAll(path.sep, "/").replace(/^\.\//, "");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseTimestamp(value) {
  const timestamp = Date.parse(String(value ?? ""));
  return Number.isFinite(timestamp) ? timestamp : null;
}

function daysSince(value, now = Date.now()) {
  const timestamp = parseTimestamp(value);
  if (timestamp === null) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now - timestamp) / DAY_MS);
}

function recencyMultiplier(days) {
  if (days <= 7) return 1;
  if (days <= 30) return 0.7;
  if (days <= 90) return 0.4;
  return 0.2;
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizePath).filter(Boolean))];
}

function mergeObjects(base, override) {
  if (!override || typeof override !== "object" || Array.isArray(override)) return { ...base };
  const output = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined) output[key] = value;
  }
  return output;
}

export function readBudgetConfig(target, explicitPath = null) {
  const candidates = [
    explicitPath ? path.resolve(target, explicitPath) : null,
    path.join(target, "joo-indexing.config.json"),
    path.join(target, ".joo-indexing.json")
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf8"));
      return {
        path: candidate,
        value: parsed && typeof parsed === "object" ? parsed : {},
        warning: null
      };
    } catch (error) {
      return { path: candidate, value: {}, warning: `Could not parse ${candidate}: ${error.message}` };
    }
  }
  return { path: null, value: {}, warning: null };
}

export function readUsageEvents(target, limit = 50) {
  const usagePath = path.join(target, ".ai", "indexing", "local-usage.json");
  if (!fs.existsSync(usagePath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(usagePath, "utf8"));
    return Array.isArray(parsed.runs) ? parsed.runs.slice(-limit) : [];
  } catch {
    return [];
  }
}

export function summarizeRoi(events) {
  const measured = events.filter((event) => {
    const benefit = Number(event.savedChars ?? event.avoidedToolOutputChars ?? 0);
    const cost = Number(event.indexReadChars ?? 0) + Number(event.maintenanceChars ?? 0);
    return benefit > 0 || cost > 0;
  });
  if (!measured.length) {
    return { status: "insufficient-data", sampleSize: 0, ratio: null, lossRate: null, expansionAllowed: false };
  }

  let benefit = 0;
  let cost = 0;
  let losses = 0;
  for (const event of measured) {
    const eventBenefit = Math.max(0, Number(event.savedChars ?? event.avoidedToolOutputChars ?? 0));
    const eventCost = Math.max(0, Number(event.indexReadChars ?? 0)) + Math.max(0, Number(event.maintenanceChars ?? 0));
    benefit += eventBenefit;
    cost += eventCost;
    if (eventBenefit < eventCost) losses += 1;
  }
  const ratio = benefit / Math.max(cost, 1);
  const lossRate = losses / measured.length;
  const poor = measured.length >= 7 && ratio < 1 && lossRate >= 0.7;
  const strong = measured.length >= 5 && ratio >= 2 && lossRate <= 0.4;
  return {
    status: poor ? "poor" : strong ? "strong" : "mixed",
    sampleSize: measured.length,
    benefitChars: benefit,
    costChars: cost,
    ratio,
    lossRate,
    expansionAllowed: strong
  };
}

function normalizeProfile(profileName) {
  const normalized = String(profileName ?? "auto").trim().toLowerCase();
  if (!["auto", ...Object.keys(BUDGET_PROFILES)].includes(normalized)) {
    throw new Error(`Unsupported indexing budget profile: ${profileName}. Use auto, tight, balanced, or retentive.`);
  }
  return normalized;
}

function autoProfileFor({ level, roi, autoShrinkOnPoorRoi = true }) {
  if (level <= 1) return "tight";
  if (autoShrinkOnPoorRoi && roi.status === "poor") return "tight";
  if (level >= 3 && roi.status === "strong") return "retentive";
  return "balanced";
}

export function resolveBudgetPolicy({
  target,
  level,
  assessment,
  requestedProfile = "auto",
  configPath = null,
  usageEvents = undefined
}) {
  const loaded = readBudgetConfig(target, configPath);
  const config = loaded.value;
  const roi = summarizeRoi(usageEvents ?? readUsageEvents(target));
  const autoShrinkOnPoorRoi = config.policy?.autoShrinkOnPoorRoi !== false;
  const requested = normalizeProfile(requestedProfile === "auto" && config.profile ? config.profile : requestedProfile);
  const resolvedName = requested === "auto" ? autoProfileFor({ level, roi, autoShrinkOnPoorRoi }) : requested;
  const base = BUDGET_PROFILES[resolvedName];
  const overrides = config.profiles?.[resolvedName] ?? config.budgetOverrides ?? {};
  const profile = mergeObjects(base, overrides);
  profile.pools = mergeObjects(base.pools, overrides.pools);

  const sourceBytes = Math.max(0, Number(assessment?.metrics?.sourceBytes ?? 0));
  const computedTotal = Math.round(sourceBytes * Number(profile.maxSourceRatio));
  const totalBytes = clamp(computedTotal, Number(profile.minTotalBytes), Number(profile.maxTotalBytes));
  const poolBytes = Object.fromEntries(Object.entries(profile.pools).map(([key, share]) => [key, Math.floor(totalBytes * Number(share))]));

  return {
    schemaVersion: 1,
    requestedProfile: requested,
    resolvedProfile: resolvedName,
    configPath: loaded.path,
    warning: loaded.warning,
    roi,
    limits: {
      ...profile,
      totalBytes,
      poolBytes
    },
    pins: {
      paths: asStringArray(config.pins?.paths),
      domains: asStringArray(config.pins?.domains).map((item) => item.toLowerCase()),
      concerns: asStringArray(config.pins?.concerns).map((item) => item.toLowerCase())
    },
    policy: {
      hardBudget: config.policy?.hardBudget !== false,
      preserveOnePerSelectedDomain: config.policy?.preserveOnePerSelectedDomain !== false,
      allowPinnedBudgetOverflow: config.policy?.allowPinnedBudgetOverflow === true,
      autoShrinkOnPoorRoi,
      recordPriorityDetails: config.policy?.recordPriorityDetails === true
    }
  };
}

export function buildUsageIndex(events, now = Date.now()) {
  const paths = new Map();
  const domains = new Map();
  const concerns = new Map();

  function update(map, key, event, errorWeight = 0) {
    if (!key) return;
    const normalized = normalizePath(key).toLowerCase();
    const previous = map.get(normalized) ?? { count: 0, decayedCount: 0, errorCount: 0, lastUsedAt: null, lastErrorAt: null };
    const age = daysSince(event.recordedAt, now);
    previous.count += 1;
    previous.decayedCount += recencyMultiplier(age);
    if (!previous.lastUsedAt || parseTimestamp(event.recordedAt) > parseTimestamp(previous.lastUsedAt)) previous.lastUsedAt = event.recordedAt;
    if (event.hadError || event.failedTest || errorWeight > 0) {
      previous.errorCount += Math.max(1, errorWeight);
      if (!previous.lastErrorAt || parseTimestamp(event.recordedAt) > parseTimestamp(previous.lastErrorAt)) previous.lastErrorAt = event.recordedAt;
    }
    map.set(normalized, previous);
  }

  for (const event of events) {
    for (const file of asStringArray(event.files)) update(paths, file, event);
    for (const domain of asStringArray(event.domains)) update(domains, domain, event);
    for (const concern of asStringArray(event.concerns)) update(concerns, concern, event);
  }
  return { paths, domains, concerns };
}

function usageFor(index, entry) {
  const pathUsage = index.paths.get(normalizePath(entry.path).toLowerCase());
  const domainUsage = entry.domain ? index.domains.get(String(entry.domain).toLowerCase()) : null;
  const concernUsage = entry.concern ? index.concerns.get(String(entry.concern).toLowerCase()) : null;
  const items = [pathUsage, domainUsage, concernUsage].filter(Boolean);
  return {
    decayedCount: items.reduce((sum, item) => sum + item.decayedCount, 0),
    errorCount: items.reduce((sum, item) => sum + item.errorCount, 0),
    lastUsedAt: items.map((item) => item.lastUsedAt).filter(Boolean).sort().at(-1) ?? null,
    lastErrorAt: items.map((item) => item.lastErrorAt).filter(Boolean).sort().at(-1) ?? null
  };
}

function roleValue(role) {
  const value = String(role ?? "").toLowerCase();
  if (/behavior-owner|behavior-candidate/.test(value)) return 8;
  if (/state-boundary|data-boundary/.test(value)) return 7;
  if (/surface-entry/.test(value)) return 6;
  if (/route-entry/.test(value)) return 5;
  if (/package|config|bootstrap|provider/.test(value)) return 4;
  return 2;
}

function complexityValue(fileBytes, importCount) {
  const sizeScore = fileBytes <= 1_500 ? 1 : fileBytes <= 6_000 ? 3 : fileBytes <= 20_000 ? 5 : 7;
  const importScore = importCount <= 2 ? 1 : importCount <= 6 ? 3 : importCount <= 12 ? 4 : 5;
  return Math.min(12, sizeScore + importScore);
}

function pathPenalty(file) {
  const normalized = normalizePath(file).toLowerCase();
  const segments = new Set(normalized.split("/"));
  let penalty = 0;
  if (["legacy", "archive", "archives", "examples", "example", "playground"].some((item) => segments.has(item))) penalty += 20;
  if (["stories", "storybook", "fixtures", "fixture"].some((item) => segments.has(item))) penalty += 16;
  if (["generated", "__generated__", "gen"].some((item) => segments.has(item)) || /\.generated\.|\.gen\./.test(normalized)) penalty += 18;
  if (/\.(test|spec|stories)\.(tsx?|jsx?|mjs|cjs)$/.test(normalized)) penalty += 6;
  return penalty;
}

export function scoreIndexEntry({
  entry,
  usageIndex,
  duplicateCount = 1,
  fileBytes = 0,
  importCount = 0,
  recentlyChanged = false,
  previous = null,
  policy,
  minEntries = 0,
  now = Date.now()
}) {
  const usage = usageFor(usageIndex, entry);
  const normalizedPath = normalizePath(entry.path);
  const pinned = policy.pins.paths.includes(normalizedPath)
    || (entry.domain && policy.pins.domains.includes(String(entry.domain).toLowerCase()))
    || (entry.concern && policy.pins.concerns.includes(String(entry.concern).toLowerCase()));

  const usageScore = Math.min(30, usage.decayedCount * 6);
  const recentDays = daysSince(usage.lastUsedAt, now);
  const recencyScore = Number.isFinite(recentDays) ? 12 * recencyMultiplier(recentDays) : 0;
  const ambiguityScore = Math.min(16, Math.max(0, duplicateCount - 1) * 4);
  const complexityScore = complexityValue(fileBytes, importCount);
  const errorScore = Math.min(15, usage.errorCount * 5);
  const changeScore = recentlyChanged ? 8 : 0;
  const boundaryScore = roleValue(entry.role);
  const retainedScore = previous ? 4 : 0;
  const nonProductionPenalty = pathPenalty(entry.path);
  const priority = Math.max(0, Math.round((usageScore + recencyScore + ambiguityScore + complexityScore + errorScore + changeScore + boundaryScore + retainedScore - nonProductionPenalty) * 100) / 100);
  const estimatedBytes = Math.max(80, Number(entry.estimatedBytes ?? 0));
  const density = priority / estimatedBytes;
  const firstSelectedAt = previous?.firstSelectedAt ?? null;
  const residenceProtected = previous && daysSince(firstSelectedAt, now) < policy.limits.minResidenceDays;
  const errorProtected = usage.lastErrorAt && daysSince(usage.lastErrorAt, now) < policy.limits.errorProtectionDays;

  return {
    ...entry,
    priority,
    density,
    pinned,
    protected: Boolean(pinned || residenceProtected || errorProtected),
    protectionReasons: [
      pinned ? "pinned" : null,
      residenceProtected ? "minimum-residence" : null,
      errorProtected ? "recent-error" : null
    ].filter(Boolean),
    signals: {
      usageScore,
      recencyScore,
      ambiguityScore,
      complexityScore,
      errorScore,
      changeScore,
      boundaryScore,
      retainedScore,
      nonProductionPenalty,
      fileBytes,
      importCount,
      duplicateCount,
      lastUsedAt: usage.lastUsedAt,
      lastErrorAt: usage.lastErrorAt
    }
  };
}

function compareCandidates(a, b) {
  if (a.protected !== b.protected) return a.protected ? -1 : 1;
  if (a.density !== b.density) return b.density - a.density;
  if (a.priority !== b.priority) return b.priority - a.priority;
  return String(a.path).localeCompare(String(b.path));
}

export function selectEntriesWithinBudget({
  entries,
  shardId,
  byteBudget,
  maxEntries,
  previousEntries = [],
  policy,
  minEntries = 0,
  now = Date.now()
}) {
  const previousMap = new Map(previousEntries.map((item) => [normalizePath(item.path), item]));
  const requestedMinimum = Math.max(0, Number(minEntries) || 0);
  const rankedEntries = [...entries].sort(compareCandidates);
  const minimumSeedPaths = new Set(
    rankedEntries.slice(0, requestedMinimum).map((entry) => normalizePath(entry.path))
  );
  const candidates = rankedEntries.filter((entry) => entry.priority >= policy.limits.minAddPriority
    || entry.protected
    || minimumSeedPaths.has(normalizePath(entry.path))
    || (previousMap.has(normalizePath(entry.path)) && entry.priority >= policy.limits.removeBelowPriority));

  const previousExisting = candidates.filter((entry) => previousMap.has(normalizePath(entry.path)));
  const minRetained = Math.min(
    previousExisting.length,
    Math.ceil(previousEntries.length * (1 - policy.limits.maxReplacementRatioPerRun))
  );
  const stablePrevious = previousExisting
    .sort((a, b) => b.priority - a.priority || String(a.path).localeCompare(String(b.path)))
    .slice(0, minRetained);
  const minimumRepresentatives = candidates
    .slice(0, requestedMinimum)
    .map((entry) => normalizePath(entry.path));
  const mandatoryPaths = new Set([
    ...candidates.filter((entry) => entry.protected).map((entry) => normalizePath(entry.path)),
    ...stablePrevious.map((entry) => normalizePath(entry.path)),
    ...minimumRepresentatives
  ]);

  const selected = [];
  let usedBytes = 0;
  const add = (entry, mandatory = false) => {
    if (selected.some((item) => item.path === entry.path)) return;
    const wouldExceed = usedBytes + entry.estimatedBytes > byteBudget;
    const countExceeded = selected.length >= maxEntries;
    if ((wouldExceed || countExceeded) && !mandatory) return;
    if (wouldExceed || countExceeded) {
      const mayOverflow = mandatory && (
        !policy.policy.hardBudget
        || (entry.pinned && policy.policy.allowPinnedBudgetOverflow)
      );
      if (!mayOverflow) return;
    }
    selected.push(entry);
    usedBytes += entry.estimatedBytes;
  };

  for (const entry of candidates.filter((item) => mandatoryPaths.has(normalizePath(item.path)))) add(entry, true);
  for (const entry of candidates) add(entry, false);

  return {
    shardId,
    selected,
    usedBytes,
    byteBudget,
    maxEntries,
    minimumRepresentativesRequested: requestedMinimum,
    minimumRepresentativesKept: selected.filter((entry) => minimumRepresentatives.includes(normalizePath(entry.path))).length,
    dropped: entries.filter((entry) => !selected.some((item) => item.path === entry.path)).map((entry) => ({
      path: entry.path,
      priority: entry.priority,
      density: entry.density,
      reason: entry.priority < policy.limits.minAddPriority ? "below-add-threshold" : "budget-or-entry-cap"
    })),
    previousCount: previousEntries.length,
    retainedCount: selected.filter((entry) => previousMap.has(normalizePath(entry.path))).length
  };
}

export function chooseShards({ shards, maxShards, previousShardIds = [], pinnedDomains = [] }) {
  const previous = new Set(previousShardIds);
  const ranked = shards.map((shard) => {
    const entries = shard.entries ?? [];
    const utility = entries.length
      ? Math.max(...entries.map((entry) => entry.priority)) + entries.reduce((sum, entry) => sum + entry.priority, 0) / entries.length
      : 0;
    const pinned = shard.required || (shard.domain && pinnedDomains.includes(String(shard.domain).toLowerCase()));
    return { ...shard, utility: utility + (previous.has(shard.id) ? 5 : 0) + (pinned ? 1_000 : 0), pinned };
  });
  return ranked
    .sort((a, b) => b.utility - a.utility || String(a.id).localeCompare(String(b.id)))
    .slice(0, Math.max(1, maxShards));
}

export function createPriorityState({ policy, shardSelections, previousState = null, now = new Date().toISOString() }) {
  const previousEntries = new Map();
  for (const shard of previousState?.shards ?? []) {
    for (const entry of shard.entries ?? []) previousEntries.set(`${shard.id}:${normalizePath(entry.path)}`, entry);
  }
  return {
    schemaVersion: 1,
    generatedAt: now,
    profile: policy.resolvedProfile,
    totalBudgetBytes: policy.limits.totalBytes,
    roi: policy.roi,
    shards: shardSelections.map((selection) => ({
      id: selection.shardId,
      usedBytes: selection.usedBytes,
      byteBudget: selection.byteBudget,
      entries: selection.selected.map((entry) => {
        const previous = previousEntries.get(`${selection.shardId}:${normalizePath(entry.path)}`);
        return {
          path: normalizePath(entry.path),
          priority: entry.priority,
          pinned: entry.pinned,
          protected: entry.protected,
          firstSelectedAt: previous?.firstSelectedAt ?? now,
          lastSelectedAt: now
        };
      })
    }))
  };
}

export function loadPriorityState(filePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return parsed && Array.isArray(parsed.shards) ? parsed : null;
  } catch {
    return null;
  }
}

export function previousEntriesForShard(state, shardId) {
  return state?.shards?.find((shard) => shard.id === shardId)?.entries ?? [];
}

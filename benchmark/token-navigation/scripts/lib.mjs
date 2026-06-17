import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const [rawKey, inline] = token.slice(2).split("=", 2);
    if (inline !== undefined) args[rawKey] = inline;
    else if (argv[i + 1] && !argv[i + 1].startsWith("--")) args[rawKey] = argv[++i];
    else args[rawKey] = true;
  }
  return args;
}

export function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

export function copyTree(source, target) {
  ensureDir(target);
  fs.cpSync(source, target, { recursive: true, force: true });
}

export function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
}

export function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
export function writeJson(file, value) { ensureDir(path.dirname(file)); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
export function normalizePath(value) { return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "").trim(); }

export function median(values) {
  const sorted = values.filter(Number.isFinite).toSorted((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function percentChange(baseline, indexed) {
  if (!Number.isFinite(baseline) || baseline === 0 || !Number.isFinite(indexed)) return null;
  return ((baseline - indexed) / baseline) * 100;
}
